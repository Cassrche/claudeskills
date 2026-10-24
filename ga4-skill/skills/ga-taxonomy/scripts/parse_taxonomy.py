"""Event taxonomy (xlsx/csv/Google Sheets) -> .ga4/taxonomy.json + taxonomy.md.

Instead of a fixed header, an alias dictionary (taxonomy_schema) maps columns to
canonical fields.
Multiple sheets are classified into event/user-property sheets by header content.
A parameter row (all name columns blank) is attributed to the previous event.
If automatic mapping fails, needs_mapping is emitted, and an explicit mapping is
accepted via --map.
"""
import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from ga4_common import (
    custom_definitions_path,
    format_api_error,
    ga4_dir,
    taxonomy_json_path,
    taxonomy_md_path,
)
from taxonomy_schema import (
    EVENT_FIELD_ALIASES,
    USER_PROP_FIELD_ALIASES,
    apply_event_context_rules,
    apply_user_prop_context_rules,
    column_letter_to_index,
    detect_mapping,
    index_to_column_letter,
    is_valid_ga4_name,
    normalize,
    parse_map_arg,
)

# For validating the right-hand side of --map: the union of both alias dictionaries'
# keys is the full set of known canonical fields.
KNOWN_FIELDS = set(EVENT_FIELD_ALIASES) | set(USER_PROP_FIELD_ALIASES)


# ---- Reading sheets --------------------------------------------------------

# csv has no notion of tabs, so this is an internal-only placeholder key. Never
# shown to the user as-is ("available sheets: (csv)" would be meaningless to a
# marketer) — parse_file rejects --sheet combined with csv input with a separate,
# clear message instead of exposing this key.
CSV_SHEET_KEY = "(csv)"


def read_sheets_from_file(path: Path) -> dict:
    """Local file -> {sheet name: [[cell,...],...]}. All sheets for xlsx, one for csv."""
    ext = path.suffix.lower()
    if ext in (".xlsx", ".xls"):
        return _read_excel_sheets(path)
    if ext == ".csv":
        return {CSV_SHEET_KEY: _read_csv(path)}
    raise ValueError(f"Unsupported file type: {ext} (only xlsx, xls, csv, or a Google Sheets URL)")


def _read_excel_sheets(path: Path) -> dict:
    import openpyxl

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        sheets = {}
        for ws in wb.worksheets:
            rows = []
            for r in ws.iter_rows(values_only=True):
                rows.append(["" if c is None else str(c).strip() for c in r])
            sheets[ws.title] = rows
        return sheets
    finally:
        wb.close()


def _read_csv(path: Path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return [[c.strip() for c in row] for row in csv.reader(f)]


# ---- Mapping / building ----------------------------------------------------

def _cell(row, idx) -> str:
    if idx is None or idx >= len(row):
        return ""
    v = row[idx]
    return "" if v is None else str(v).strip()


# A header that failed alias matching but looks like a parameter column.
# Used only to decide whether to fail the parse — see the failure condition in
# main(). Without this guard, a harmless unmapped column (비고/Note) would fail
# a perfectly valid taxonomy that simply has no parameters.
PARAM_COLUMN_KEYWORDS = ("매개변수", "파라미터", "속성", "param", "attribute")


def looks_like_param_column(header) -> bool:
    """True if an unmapped header looks like it was meant to be a parameter column."""
    text = str(header).strip().lower()
    if not any(kw in text for kw in PARAM_COLUMN_KEYWORDS):
        return False
    # '속성' is a real parameter-column keyword ("매개변수(이벤트 속성)", "이벤트
    # 속성"), but it's also this codebase's own word for a *user property*
    # (USER_PROP_FIELD_ALIASES["up_name"] includes 속성명/사용자속성). Without this
    # exclusion, a legitimate user-property column gets misread as a missed
    # parameter column, and a sheet that mixes events (with no parameters) and
    # user properties fails to parse even though it's valid. Compare via
    # normalize() (not a second hand-rolled rule) so this stays consistent with
    # how every other header comparison in this codebase works.
    norm = normalize(header)
    for names in USER_PROP_FIELD_ALIASES.values():
        if norm in names:
            return False
    return True


def _header_claimed_columns(header):
    """{column index: field} for every column whose own header text names a field.

    Both alias dictionaries are consulted, not just the one being applied. A
    --map letter is a statement about a position, and on a mixed sheet the
    position it names may already be spoken for by the *other* dictionary:
    measured on a tab holding events and user properties together,
    `--map "B=up_ga4_name"` aimed at a blank header elsewhere took the
    `GA4 이벤트명` column here, and every event row was collected as a user
    property named `login`/`purchase` — valid GA4 identifiers, so not even the
    invalid-name warning could see it.

    Only headers that *resolve* count, which is what keeps the fallback usable:
    a blank header, an unrecognized header, and the second of two identical
    headers all resolve to nothing, so a letter still reaches them.
    """
    claimed = {}
    for aliases, rules in ((EVENT_FIELD_ALIASES, apply_event_context_rules),
                           (USER_PROP_FIELD_ALIASES, apply_user_prop_context_rules)):
        mapping, unmapped = detect_mapping(header, aliases)
        mapping, _unmapped = rules(header, mapping, unmapped)
        for field, idx in mapping.items():
            claimed.setdefault(idx, field)
    return claimed


# Every value `map_resolution` can carry, in one place, because the SKILL.md
# procedure is written against these exact strings and a test asserts the two
# stay in step (test_skill_md_quotes_every_resolution_string).
#
# The invariant the prose relies on: a resolution either names where the key was
# read (`header`, `column B`) or starts with `ignored — ` and says why nothing
# was read. There is no third kind, so "did my mapping land" is answerable
# without knowing this list by heart.
RESOLUTION_HEADER = "header"
RESOLUTION_COLUMN = "column {letter}"
RESOLUTION_COLUMN_TAKEN = "ignored — column {letter} {source} {field}"
RESOLUTION_TAKEN_BY_HEADER = "from its own header"
RESOLUTION_TAKEN_BY_MAP = "already explicitly mapped to"
# One field can hold one column per sheet. A second --map key aimed at a field
# an earlier key already placed used to win silently while BOTH keys were
# reported as read — measured on a tab with blank headers at B and C:
# `--map "B=up_ga4_name,C=up_ga4_name"` reported `column B` and `column C`, and
# the C values were what landed in taxonomy.json. Both were valid GA4
# identifiers, so find_invalid_ga4_names could not see it either. That is the
# original incident (a label column read as the name column) re-created by the
# remediation for it, which is why the loser is refused out loud rather than
# resolved last-key-wins.
RESOLUTION_FIELD_TAKEN = "ignored — {field} already read from column {letter} by key {key}"
# The key addressed nothing on this tab: not a header here, and not a column
# letter within this tab's width (`ZZ` on a three-column sheet, or a numeric key
# — see column_letter_to_index on why numbers are not column addresses).
RESOLUTION_NO_MATCH = "ignored — no header or column on this tab matched this key"
# The mapping was built but the tab was never harvested with it, so nothing was
# read no matter where the key pointed. Reported because the old text ("column
# C") was a claim about a column that was never consumed.
RESOLUTION_UNUSED = "ignored — nothing was read from this tab ({reason})"
UNUSED_NO_USER_PROPS = "no user-property name column here"
UNUSED_NO_EVENTS = "no event name column here"
UNUSED_OTHER_SHEET = "--sheet points at another tab"


def _apply_overrides(header, aliases, overrides, context_rules=None):
    """Overlays an explicit --map on top of the automatic mapping (explicit wins).

    - Context rules (context_rules) are applied right after automatic mapping ->
      --map wins over the rules.
    - If an override's right-hand field isn't in the union of both dictionaries,
      raise ValueError (catch typos early).
    - Only overrides whose key is in this aliases dictionary are applied in this
      pass (fields belonging to the other dictionary are skipped).
    - Resolve field conflicts: before assigning, remove any existing column
      already holding the same field, to keep a 1:1 mapping. A column the
      *automatic* mapping chose is displaced silently — that is what "explicit
      wins" means. A column another --map key placed is not: see
      RESOLUTION_FIELD_TAKEN.

    The returned resolution describes what happened, not what was asked for.
    Every key of this pass's dictionary gets exactly one entry.
    """
    mapping, unmapped = detect_mapping(header, aliases)
    if context_rules is not None:
        mapping, unmapped = context_rules(header, mapping, unmapped)
    if not overrides:
        return mapping, unmapped, {}
    valid_here = set(aliases)
    overridden_keys = set()  # normalized --map keys consumed by a header match in this pass
    explicitly_mapped_columns = set()  # column indices that were changed by explicit --map
    resolution = {}
    # field -> (key, column index) for fields placed by a --map key in this pass.
    # Only --map placements are tracked: displacing an *automatic* mapping is the
    # point of --map, while displacing another key's placement is a conflict
    # between two explicit statements and cannot be resolved by picking one.
    placed_by = {}
    for idx, h in enumerate(header):
        head = "" if h is None else str(h).strip()
        if not head:
            continue
        norm = normalize(head)
        field = overrides.get(norm)
        if not field:
            continue
        if field not in KNOWN_FIELDS:
            raise ValueError(
                f"Unknown field in --map: {field!r}. "
                f"Allowed fields: {', '.join(sorted(KNOWN_FIELDS))}"
            )
        if field not in valid_here:
            # A field that isn't this pass's concern (belongs to the other dictionary) is skipped here.
            continue
        if field in placed_by and placed_by[field][0] != norm:
            prev_key, prev_idx = placed_by[field]
            resolution[norm] = RESOLUTION_FIELD_TAKEN.format(
                field=field, letter=index_to_column_letter(prev_idx), key=prev_key)
            continue
        # If this column was already automatically assigned to a different field, undo that assignment.
        for existing_field, existing_idx in list(mapping.items()):
            if existing_idx == idx:
                mapping.pop(existing_field)
        mapping.pop(field, None)  # clear so the same field doesn't remain on a different column
        mapping[field] = idx
        # The same key matching two identical headers is not a conflict — it is
        # one statement about an ambiguous sheet, and the last match wins as it
        # always has. Only a *different* key is refused above.
        placed_by[field] = (norm, idx)
        overridden_keys.add(norm)
        explicitly_mapped_columns.add(idx)
        resolution[norm] = RESOLUTION_HEADER
    unmapped = [h for h in unmapped if normalize(h) not in overridden_keys]

    # Column-letter fallback. Header text wins: a sheet whose header really is
    # "B" keeps that meaning, and only a key that matched no header falls
    # through to addressing a column. The fallback exists because a blank
    # header cannot be named at all — it is skipped in detect_mapping, here,
    # and in the diagnostics — so a letter is the only handle that always
    # exists.
    letter_headers = set()
    claimed = _header_claimed_columns(header)
    for key, field in overrides.items():
        if key in overridden_keys:
            continue
        idx = column_letter_to_index(key)
        if idx is None or idx >= len(header):
            continue
        if field not in KNOWN_FIELDS:
            raise ValueError(
                f"Unknown field in --map: {field!r}. "
                f"Allowed fields: {', '.join(sorted(KNOWN_FIELDS))}"
            )
        if field not in valid_here:
            continue
        # A letter never takes a column that its own header already named.
        # A --map key applies to every tab in the workbook, and the letter that
        # addresses a blank header on one tab is an ordinary, correctly
        # auto-detected column on another. Measured before this guard existed,
        # on a three-tab workbook: `--map "B=up_ga4_name"` aimed at a blank
        # header took the `타입` column on an unrelated tab, so "string" became
        # the GA4 name for all three of its rows, _dedupe_by_name merged them
        # into one, and three user properties disappeared with ok:true and zero
        # warnings. `타입`/`type` is in USER_PROP_FIELD_ALIASES itself, so this
        # is a shape the schema anticipates rather than an exotic neighbour.
        #
        # Refusing costs nothing the fallback was for: a blank header, an
        # unrecognized header and a duplicated header all leave the column
        # unmapped here, so the letter still reaches every column that has no
        # other way of being named.
        if idx in mapping.values() or idx in claimed:
            taken = next((f for f, i in mapping.items() if i == idx), None) or claimed[idx]
            # Said out loud rather than skipped silently. Silent reinterpretation
            # is the failure this whole mechanism exists to remove, and on a
            # multi-tab workbook this line is how the reader learns the letter
            # meant something else over there.
            if idx in explicitly_mapped_columns:
                source = RESOLUTION_TAKEN_BY_MAP
            else:
                source = RESOLUTION_TAKEN_BY_HEADER
            resolution[key] = RESOLUTION_COLUMN_TAKEN.format(
                letter=index_to_column_letter(idx), source=source, field=taken)
            continue
        if field in placed_by:
            # Same rule as the header half: the field is spoken for by another
            # explicit key on this sheet. Taking it here would leave the earlier
            # key reported as read while its column had been swapped out.
            prev_key, prev_idx = placed_by[field]
            resolution[key] = RESOLUTION_FIELD_TAKEN.format(
                field=field, letter=index_to_column_letter(prev_idx), key=prev_key)
            continue
        mapping.pop(field, None)
        mapping[field] = idx
        placed_by[field] = (key, idx)
        resolution[key] = RESOLUTION_COLUMN.format(letter=index_to_column_letter(idx))
        head = "" if header[idx] is None else str(header[idx]).strip()
        if head:
            # The header-match half above already drops consumed headers from
            # `unmapped`; a column reached by letter has to drop its header too.
            # Otherwise that header stays in event_unmapped, where
            # looks_like_param_column reads it and the needs_mapping diagnostics
            # report a column that is, in fact, mapped.
            letter_headers.add(normalize(head))
    if letter_headers:
        unmapped = [h for h in unmapped if normalize(h) not in letter_headers]
    # A key that reached neither a header nor a column used to leave no trace at
    # all: `--map "2=up_ga4_name"` came back ok:true with the key absent from
    # map_resolution and no warning, and so did `ZZ` on a three-column sheet.
    # "Nothing happened" is a resolution too, and it is the one a reader most
    # needs to see, because the mapping they were told to make did not happen.
    for key, field in overrides.items():
        if key in resolution:
            continue
        if field in KNOWN_FIELDS and field not in valid_here:
            continue  # belongs to the other dictionary; that pass reports it
        resolution[key] = RESOLUTION_NO_MATCH
    return mapping, unmapped, resolution


# `items.` / `items[].` / `items[0].` — all three notations appear in real
# taxonomy sheets. A prefix is an unambiguous signal that the parameter lives
# in the ecommerce items array, which is exactly the distinction
# param_naming's comment block warns about: a bare `item_name` sent as a direct
# event parameter is NOT the same value as itemName from the items array.
_ITEM_PREFIX_RE = re.compile(r"^items(?:\[\d*\])?\.(.+)$", re.IGNORECASE)

_SCOPE_WORDS = {
    "item": "item", "항목": "item", "상품": "item", "아이템": "item",
    "event": "event", "이벤트": "event",
    "user": "user", "사용자": "user", "유저": "user",
}
# Shown to the author when a scope value isn't recognized, so the fix is
# copy-pasteable rather than a guess.
SCOPE_VOCABULARY = sorted(_SCOPE_WORDS)


def split_item_prefix(name):
    """'items.item_name' -> ('item_name', 'item'). No prefix -> (name, None)."""
    text = str(name).strip()
    m = _ITEM_PREFIX_RE.match(text)
    if m:
        return m.group(1).strip(), "item"
    return text, None


def normalize_scope(text):
    """A scope-column value -> 'item'/'event'/'user'. Unknown or blank -> None."""
    return _SCOPE_WORDS.get(str(text).strip().lower())


# Words a sheet uses to head a block of parameters shared by every event. Used
# only to *warn*, never to decide: attribution stays positional, exactly as the
# comment in build_events describes.
_COMMON_CATEGORY_WORDS = ("공통", "common", "global", "전역")

# Nouns that may trail the word above without changing the meaning of the
# heading, so "공통 매개변수" and "Common Parameters" both read as the block
# header they are.
_COMMON_CATEGORY_NOUNS = ("매개변수", "파라미터", "속성", "parameters", "parameter",
                          "params", "param", "attributes", "attribute", "fields", "field")


def _looks_common(category):
    """True when the category *is* a common-parameter heading.

    Substring matching was too loose to warn on: "Global Navigation", "Common
    Actions" and "GlobalHeader" are ordinary category names on a real sheet, and
    every one of them matched. The warning it feeds is a long instruction to
    move the block above the first event and re-parse, emitted once per
    parameter in the category — noisy enough that the author stops reading it,
    which costs the real case. So require the heading to reduce to the word
    itself once the generic trailing noun is removed.
    """
    text = str(category or "").strip().lower()
    if not text:
        return False
    for noun in _COMMON_CATEGORY_NOUNS:
        text = text.replace(noun, " ")
    text = " ".join(text.replace("_", " ").replace("-", " ").split())
    return text in _COMMON_CATEGORY_WORDS


def build_events(data_rows, mapping):
    events = []
    index = {}
    last_category = ""
    common_parameters = []
    absorbed_common = []
    for row in data_rows:
        category = _cell(row, mapping.get("category"))
        if category:
            last_category = category
        else:
            # A vertically merged cell arrives as an empty string, so it inherits
            # the previous category. Event/description/event-name are NOT
            # forward-filled — a blank value there means "this is a parameter
            # row for the previous event."
            category = last_category
        label = _cell(row, mapping.get("event_label"))
        ga4 = _cell(row, mapping.get("ga4_name"))
        edesc = _cell(row, mapping.get("event_description"))
        pname = _cell(row, mapping.get("param_name"))
        pscope = _cell(row, mapping.get("param_scope"))
        ptype = _cell(row, mapping.get("param_type"))
        pdesc = _cell(row, mapping.get("param_description"))
        pex = _cell(row, mapping.get("param_example"))
        if not any([category, label, ga4, edesc, pname, ptype, pdesc, pex, pscope]):
            continue
        if label or ga4:
            ga4_final = ga4 or label
            label_final = label or ga4
            key = (category, ga4_final)
            if key not in index:
                ev = {
                    "category": category,
                    "label": label_final,
                    "ga4_name": ga4_final,
                    "description": edesc,
                    "parameters": [],
                }
                index[key] = ev
                events.append(ev)
            target = index[key]
        else:
            target = events[-1] if events else None
        if pname:
            base_name, prefix_scope = split_item_prefix(pname)
            column_scope = normalize_scope(pscope)
            # The prefix wins: a scope column applies to the whole row, while
            # the prefix names this one parameter, so it is the more specific
            # statement. The overridden column value is kept as scope_conflict
            # on the parameter object written to taxonomy.json, for a person
            # inspecting that file directly -- no code currently reads this
            # key back out (taxonomy_diff.py only takes (name, scope) via
            # _defined_parameters, and param_naming.py never sees it).
            if prefix_scope:
                scope, scope_source = prefix_scope, "prefix"
            elif column_scope:
                scope, scope_source = column_scope, "column"
            elif pscope:
                # The author DID fill in the scope column, with a word this
                # parser doesn't know. Previously indistinguishable from a
                # blank cell, which made the downstream advice actively wrong:
                # taxonomy_diff tells them "the taxonomy does not state this
                # parameter's scope ... add a scope column", when they already
                # have one and already filled it in. Keep it distinguishable
                # and keep the raw text so the warning can quote it back.
                scope, scope_source = None, "unrecognized"
            else:
                scope, scope_source = None, "unresolved"
            param = {"name": base_name, "type": ptype, "description": pdesc,
                     "example": pex, "scope": scope, "scope_source": scope_source}
            if scope_source == "unrecognized":
                param["scope_raw"] = pscope
            if prefix_scope and column_scope and column_scope != prefix_scope:
                param["scope_conflict"] = column_scope
            # A category naming this block "common" while it is being attached
            # to an event. Position still decides — changing that would rewrite
            # how every existing sheet parses — but the mismatch is worth saying
            # out loud, because the absorption is otherwise silent and the
            # result looks like a normal event parameter.
            if target is not None and _looks_common(category):
                absorbed_common.append((target.get("ga4_name") or target.get("label"),
                                        base_name))
            if target is None:
                # No event to attach to yet -> a common parameter that doesn't
                # belong to any specific event. The sheet doesn't say which event
                # it belongs to, so we don't make one up — it's kept separately.
                # This is decided purely by position: a common-parameter block
                # must sit above the first event. If it appears between events,
                # it's silently absorbed into the previous event's parameters
                # (no error) — this is not decided by the category string.
                common_parameters.append(param)
            else:
                target["parameters"].append(param)
    return events, common_parameters, absorbed_common


def find_case_only_duplicate_events(events):
    """Find ga4_names that differ only by letter case.

    Events are keyed by the exact (category, ga4_name) string, so `Purchase`
    and `purchase` become two separate events and their parameters get split
    between them — the sheet author almost always meant one event. Confirmed
    downstream: taxonomy_diff then reports the unused casing as "defined but
    not collected recently", sending the marketer to investigate tracking
    that is in fact working. The near-miss detector cannot catch this, since
    it only pairs defined-but-unseen names against collected-but-undefined
    ones, and here the correct casing IS defined.

    Deliberately a warning, not an error, and deliberately NOT auto-merged:
    GA4 event names are technically case-sensitive, so two casings could in
    principle both be real. Naming them lets the author decide.
    """
    by_lower = {}
    for ev in events:
        name = ev.get("ga4_name") or ""
        if name:
            by_lower.setdefault(name.lower(), []).append(name)
    out = []
    for variants in by_lower.values():
        distinct = sorted(set(variants))
        if len(distinct) > 1:
            out.append(distinct)
    return sorted(out)


# How far down to look for the real header row. Real sheets put a title,
# a note, or a blank spacer above it; going much deeper than this starts
# risking a data row that happens to look header-ish.
HEADER_SEARCH_ROWS = 10


def find_header_row(rows, overrides=None):
    """Index of the row that actually looks like the header.

    Row 0 was assumed to be the header, so a sheet with a title line
    ("2026 E-commerce Event Taxonomy") or a blank spacer above it parsed as
    ZERO events. The failure was at least loud (needs_mapping), but the hint
    told the author to map their columns with --map, which cannot fix a
    header that simply isn't on row 0 — following it changes nothing.

    Scores each candidate row by how many known aliases it contains and takes
    the best, with row 0 winning ties so a well-formed sheet is untouched.
    """
    if not rows:
        return 0
    known = set()
    for aliases in EVENT_FIELD_ALIASES.values():
        known.update(aliases)
    for aliases in USER_PROP_FIELD_ALIASES.values():
        known.update(aliases)
    # Caught in review: without the --map keys, a sheet with BOTH a title row
    # AND custom column names — precisely the sheet that needs --map — scores
    # zero everywhere, falls back to row 0, and matches the overrides against
    # the title row. The user follows the needs_mapping hint and it still
    # fails, with no remaining way out.
    #
    # A key that addresses an existing column is excluded. It names a position,
    # not a header, so letting it into the known-alias set makes any row holding
    # a bare "B" — a title, a legend, a spacer — score as a header candidate.
    # Same failure shape as the empty key parse_map_arg already drops, one
    # alphabet apart.
    #
    # "Addresses an existing column" is the whole test, not "is alphabetic":
    # `Cat`, `Attr` and `ActionKey` are ordinary header texts that happen to be
    # all letters, and each resolves to a column index thousands or billions
    # deep, which no sheet has. _apply_overrides applies the same bound
    # (idx >= len(header) is ignored), so a key excluded here is exactly a key
    # that could have been read as a column, and no other.
    #
    # A purely numeric key is excluded for the same reason one alphabet over. It
    # cannot address a column — numbers are deliberately not column addresses,
    # see column_letter_to_index — so it is almost always a 1-based index someone
    # wrote by hand, and admitting it lets a legend row of column numbers win the
    # search. Measured on a sheet whose row 0 was `1,2,3` and whose real header
    # row 1 was `항목,코드,메모`: `--map "항목=up_name,2=up_ga4_name"` selected row
    # 0, and the parse came back needs_mapping quoting `["1","2","3"]` as the
    # headers. Dropping it costs only the rare sheet whose header cell really is
    # the text "2": the key still matches that header once the row is found, it
    # just no longer helps find it.
    if overrides:
        width = max((len(r) for r in rows[:HEADER_SEARCH_ROWS]), default=0)
        for key in overrides:
            if key.isdigit():
                continue
            idx = column_letter_to_index(key)
            if idx is None or idx >= width:
                known.add(key)

    best_idx, best_score = 0, -1
    for idx, row in enumerate(rows[:HEADER_SEARCH_ROWS]):
        score = sum(1 for cell in row if normalize(cell) in known)
        if score > best_score:
            best_idx, best_score = idx, score
    return best_idx if best_score > 0 else 0


# GA4 collection limits for standard properties, from
# support.google.com/analytics/answer/9267744 (checked 2026-07-22). A taxonomy
# is a *plan*: nothing here fails at parse time, it fails months later in
# production, quietly. The severities differ and the wording follows Google's:
#
#   >25 event-scoped parameters   Analytics "doesn't log events" that exceed it
#                                 — the whole event disappears, not just the
#                                 extra parameters. This is the expensive one.
#   >27 custom item parameters    per ecommerce event
#   name >40 / >24 chars          the parameter/property "is not processed"
#   >25 user properties           the ones past 25 "are not logged"
#
# Only the unambiguous counts are checked. Value-length limits (100 chars, with
# per-field exceptions) are about the data a site sends at runtime, which a
# taxonomy's "example value" column does not reliably represent — flagging on
# an example would be a guess about production.
GA4_MAX_EVENT_PARAMS = 25
GA4_MAX_CUSTOM_ITEM_PARAMS = 27
GA4_MAX_PARAM_NAME_CHARS = 40
GA4_MAX_USER_PROPERTIES = 25
GA4_MAX_USER_PROPERTY_NAME_CHARS = 24
GA4_LIMITS_DOC = "support.google.com/analytics/answer/9267744"


def _is_standard_item_field(name):
    import param_naming

    return (name in param_naming.ITEM_STANDARD_DIMENSIONS
            or name in param_naming.ITEM_STANDARD_METRICS)


def find_limit_violations(events, user_properties=None, common_parameters=None):
    """Places the taxonomy plans more than GA4 will collect. Returns warning strings.

    common_parameters count toward every event's budget, because that is what
    "common" means — they ride along on each event GA4 receives. Leaving them out
    was not a rounding error: a sheet with a common block is the structure most
    likely to cross the 25-parameter limit without any single event looking large,
    and this check exists precisely because crossing it drops the **whole event**.
    """
    out = []
    common = [p for p in (common_parameters or []) if isinstance(p, dict)]
    common_event_scoped = [p for p in common if (p.get("scope") or "event") == "event"]
    for event in events or []:
        if not isinstance(event, dict):
            continue
        name = event.get("ga4_name") or event.get("label") or "(unnamed)"
        params = [p for p in (event.get("parameters") or []) if isinstance(p, dict)]
        # An unstated scope defaults to event scope, matching how the rest of
        # this module treats it.
        event_scoped = [p for p in params if (p.get("scope") or "event") == "event"]
        total_event_scoped = len(event_scoped) + len(common_event_scoped)
        if total_event_scoped > GA4_MAX_EVENT_PARAMS:
            detail = (
                f"{len(event_scoped)} of its own plus {len(common_event_scoped)} common"
                if common_event_scoped else f"{total_event_scoped}"
            )
            out.append(
                f"Event '{name}' carries {total_event_scoped} event-scoped parameters "
                f"({detail}), over GA4's "
                f"limit of {GA4_MAX_EVENT_PARAMS}. Analytics does not log an event that exceeds it — "
                f"the whole event goes missing, not just the extra parameters ({GA4_LIMITS_DOC}). "
                "Cut it down before this ships."
            )
        custom_item = [p for p in params
                       if p.get("scope") == "item"
                       and not _is_standard_item_field(p.get("name"))]
        if len(custom_item) > GA4_MAX_CUSTOM_ITEM_PARAMS:
            out.append(
                f"Event '{name}' defines {len(custom_item)} custom item-scoped parameters, over "
                f"GA4's limit of {GA4_MAX_CUSTOM_ITEM_PARAMS} per ecommerce event "
                f"({GA4_LIMITS_DOC}). Standard item fields such as item_id/item_name do not "
                "count toward it; these are the custom ones."
            )
        for p in params:
            pname = p.get("name") or ""
            if len(pname) > GA4_MAX_PARAM_NAME_CHARS:
                out.append(
                    f"Parameter '{pname}' on '{name}' is {len(pname)} characters, over GA4's "
                    f"{GA4_MAX_PARAM_NAME_CHARS}-character parameter-name limit — it is not "
                    f"processed at all ({GA4_LIMITS_DOC})."
                )
    # The 40-character name limit applies to common parameters too — they are
    # ordinary event parameters, they just appear once in the sheet.
    for p in common:
        pname = p.get("name") or ""
        if len(pname) > GA4_MAX_PARAM_NAME_CHARS:
            out.append(
                f"Common parameter '{pname}' is {len(pname)} characters, over GA4's "
                f"{GA4_MAX_PARAM_NAME_CHARS}-character parameter-name limit — it is not "
                f"processed at all, on every event that carries it ({GA4_LIMITS_DOC})."
            )
    props = [u for u in (user_properties or []) if isinstance(u, dict)]
    if len(props) > GA4_MAX_USER_PROPERTIES:
        out.append(
            f"The taxonomy defines {len(props)} user properties, over GA4's limit of "
            f"{GA4_MAX_USER_PROPERTIES} per property. The ones past the limit are not logged "
            f"({GA4_LIMITS_DOC})."
        )
    for u in props:
        uname = u.get("name") or ""
        if len(uname) > GA4_MAX_USER_PROPERTY_NAME_CHARS:
            out.append(
                f"User property '{uname}' is {len(uname)} characters, over GA4's "
                f"{GA4_MAX_USER_PROPERTY_NAME_CHARS}-character limit for user property names — "
                f"it is not processed ({GA4_LIMITS_DOC})."
            )
    return out


def find_unscoped_item_fields(events, common_parameters=None):
    """items-array field names left without a scope. Returns [(event, [names]), ...].

    common_parameters are reported under the label "(common parameters)" — they
    are not attached to one event, and naming a single event would send the
    marketer to fix the wrong row of the sheet.

    The sibling of find_unrecognized_scopes: there the scope column held a word
    the parser could not read, here it is blank for a name that plainly implies
    one. A blank scope defaults to event, and for these names that flips the
    answer completely.

    Measured on a live taxonomy, where the same sheet scoped some ecommerce
    events and not others:

      view_item     item_id  ->  itemId (standard, item scope)
      add_to_cart   item_id  ->  customEvent:item_id
      view_item     price    ->  itemRevenue (aggregate metric, item scope)
      add_to_cart   price    ->  Not registered - cannot query

    Those are not two spellings of one answer. As the comment block in
    param_naming spells out, a bare `item_name` sent as a direct event parameter
    is a different value from itemName in the items array — so analysis reads a
    different number, or none at all.

    Reported, never corrected. `price` and `quantity` can legitimately be
    event-scoped parameters on a non-ecommerce event, and silently rewriting the
    author's sheet would replace a visible gap with an invisible assumption.
    """
    import param_naming

    item_fields = set(param_naming.ITEM_STANDARD_DIMENSIONS) | set(
        param_naming.ITEM_STANDARD_METRICS)
    out = []
    for event in events or []:
        if not isinstance(event, dict):
            continue
        names = [
            p.get("name") for p in (event.get("parameters") or [])
            if isinstance(p, dict)
            and p.get("name") in item_fields
            and not p.get("scope")
        ]
        if names:
            out.append((event.get("ga4_name") or event.get("label") or "(unnamed)",
                        sorted(set(names))))
    common_names = [
        p.get("name") for p in (common_parameters or [])
        if isinstance(p, dict) and p.get("name") in item_fields and not p.get("scope")
    ]
    if common_names:
        out.append(("(common parameters)", sorted(set(common_names))))
    return out


def find_unrecognized_scopes(events, common_parameters=None):
    """Collect scope-column values the parser didn't understand.

    Returns [(parameter_name, raw_text), ...], deduplicated and sorted. These
    were silently dropped to "no scope stated" before, which is the worst
    possible outcome: the author expressed an intent, it vanished, and the
    downstream hint then told them to do the thing they had already done.
    """
    seen = set()
    for group in (events or []):
        for p in group.get("parameters", []):
            if p.get("scope_source") == "unrecognized":
                seen.add((p.get("name", ""), p.get("scope_raw", "")))
    for p in (common_parameters or []):
        if p.get("scope_source") == "unrecognized":
            seen.add((p.get("name", ""), p.get("scope_raw", "")))
    return sorted(seen)


def build_user_properties(data_rows, mapping):
    """Collects every row where a user-property column is filled in.

    Some taxonomies mix events and user properties in one sheet, so rows are
    scanned individually. This catches both a user-property block at the top
    and inline notation next to an event.
    Deduplication happens once, after build_from_sheets gathers all sheets.

    `name` is the GA4 name when the sheet supplies one and the label otherwise
    — the same fallback events use (`ga4_final = ga4 or label`). `label` is
    filled only when the two are genuinely different columns, so an existing
    single-column sheet keeps producing exactly what it produced before, with
    label as None meaning "this sheet did not distinguish the two".
    """
    props = []
    for row in data_rows:
        label = _cell(row, mapping.get("up_name"))
        ga4 = _cell(row, mapping.get("up_ga4_name"))
        if not label and not ga4:
            continue
        props.append({
            "name": ga4 or label,
            "label": label if ga4 and label else None,
            "type": _cell(row, mapping.get("up_type")),
            "description": _cell(row, mapping.get("up_description")),
            "example": _cell(row, mapping.get("up_example")),
            "scope": "user",
        })
    return props


def _dedupe_by_name(items):
    """Deduplicates by name. Keeps the first-seen item (and its description)."""
    seen, out = set(), []
    for it in items:
        name = it.get("name")
        if not name or name in seen:
            continue
        seen.add(name)
        out.append(it)
    return out


def find_invalid_ga4_names(events, common_parameters=None, user_properties=None):
    """Names that cannot be GA4 identifiers, grouped by where they came from.

    Measured on a real taxonomy: a sheet kept the human label in one column and
    the GA4 name in a column whose header cell was blank. The blank header is
    skipped everywhere, so the labels were stored as names and the parse
    reported ok. All 24 user properties were in fact registered and working;
    the comparison step reported all 24 as "not registered", and the warning
    that reached the user told them to delete 12 of them.

    Only non-empty groups appear in the result, so `if find_invalid_ga4_names(...)`
    reads as "something is wrong".
    """
    out = {}
    bad_events = [e.get("ga4_name") for e in events
                  if e.get("ga4_name") and not is_valid_ga4_name(e["ga4_name"])]
    params = []
    for e in events:
        params.extend(p.get("name") for p in e.get("parameters", [])
                      if p.get("name") and not is_valid_ga4_name(p["name"]))
    params.extend(p.get("name") for p in (common_parameters or [])
                  if p.get("name") and not is_valid_ga4_name(p["name"]))
    bad_ups = [u.get("name") for u in (user_properties or [])
               if u.get("name") and not is_valid_ga4_name(u["name"])]
    if bad_events:
        out["events"] = list(dict.fromkeys(bad_events))
    if params:
        out["parameters"] = list(dict.fromkeys(params))
    if bad_ups:
        out["user_properties"] = list(dict.fromkeys(bad_ups))
    return out


def describe_unnamed_columns(header, data_rows, limit=3):
    """Columns whose header cell is blank but whose rows hold values.

    These are invisible everywhere else: detect_mapping, _apply_overrides and
    the needs_mapping diagnostics all skip a blank header, so the column
    holding the GA4 names could not be seen, named, or mapped — and the
    diagnostics gave no hint it existed. Sample values are the whole point: a
    column with no header can only be identified by what is in it, and they are
    what tells the reader which --map letter to use.

    A blank header with no values under it is a spacer, not a forgotten label,
    so it is not reported.
    """
    out = []
    for idx, h in enumerate(header):
        if str(h if h is not None else "").strip():
            continue
        samples = []
        for row in data_rows:
            value = _cell(row, idx)
            if value:
                samples.append(value)
            if len(samples) >= limit:
                break
        if samples:
            out.append({
                "column": index_to_column_letter(idx),
                "header": None,
                "sample_values": samples,
            })
    return out


def collect_param_types(sheets, skip=()):
    """Collects (name -> type) from a reference tab that only holds parameter types.

    Some operational taxonomies have no type column on the event tab, and instead
    keep a separate tab collecting parameter types (observed shape: "Custom
    Parameter | Type | (blank) | Default Parameter | Type"). Skipping this tab
    would leave every parameter type in the taxonomy blank, and the "Type" column
    in taxonomy.md would look entirely empty — even though the information exists
    in the same workbook.

    Finds every header pair where **the column right after a name column is a
    type column**, so whether there's one such pair or several (as in the example
    above), they're all read by the same rule. detect_mapping only captures one
    column per field and would miss the second pair, so it isn't used here.
    """
    name_aliases = set(EVENT_FIELD_ALIASES["param_name"])
    type_aliases = set(EVENT_FIELD_ALIASES["param_type"])
    types = {}
    for sheet, rows in sheets.items():
        if sheet in skip or not rows:
            continue
        # No overrides here: --map targets the event sheet's columns, and this
        # reference-tab scan matches on the built-in name/type aliases only.
        header_idx = find_header_row(rows)
        header = [normalize(h) for h in rows[header_idx]]
        pairs = [
            (i, i + 1)
            for i in range(len(header) - 1)
            if header[i] in name_aliases and header[i + 1] in type_aliases
        ]
        if not pairs:
            continue
        for row in rows[header_idx + 1:]:
            for name_i, type_i in pairs:
                if name_i >= len(row):
                    continue
                name = str(row[name_i]).strip()
                if not name:
                    continue
                value = str(row[type_i]).strip() if type_i < len(row) else ""
                # Keep the first value seen — if the same name appears on
                # multiple tabs, the earlier one wins.
                types.setdefault(name, value)
    return {k: v for k, v in types.items() if v}


def apply_param_types(events, common_parameters, types):
    """Fills in only the empty parameter types, from the reference table's values.

    A type written directly in the taxonomy always wins — the reference table is
    a fallback source only.
    """
    filled = 0
    buckets = [e.get("parameters") or [] for e in events]
    buckets.append(common_parameters)
    for params in buckets:
        for p in params:
            if p.get("type"):
                continue
            value = types.get(p.get("name"))
            if value:
                p["type"] = value
                filled += 1
    return filled


def _unused_resolution(read_as, reason):
    """Rewrites a placement into "nothing was read here" for an unharvested tab.

    A refusal is left alone: it already says nothing was read, and it names the
    column that took the letter, which is the more useful of the two facts.
    """
    if read_as.startswith("ignored"):
        return read_as
    return RESOLUTION_UNUSED.format(reason=reason)


def build_from_sheets(sheets: dict, overrides=None, sheet_name=None) -> dict:
    """Scans the sheets and builds events/common_parameters/user_properties.

    A single sheet can be an event sheet while also holding user properties, so
    the two checks are applied independently (not via elif). If sheet_name is
    given, only that one sheet is treated as the event sheet — the rest are
    ignored as events, but user properties are still collected from every sheet.
    Otherwise, using --sheet on a taxonomy where the event tab and the
    user-property tab are separate would wipe out the user properties entirely.
    """
    if sheet_name is not None and sheet_name not in sheets:
        err = ValueError(
            f"Sheet {sheet_name!r} was not found. "
            f"Available sheets: {', '.join(sheets)}"
        )
        # main() forwards this hint as-is in the JSON response — a typo'd or
        # extra-whitespace tab name is a common mistake, so showing the actual
        # tab list directly helps the retry. At this point we haven't yet
        # classified which tabs look like event sheets (that happens in the loop
        # below), so we can't narrow the list to just the event-looking tabs —
        # instead, the wording makes clear that the user needs to point at "the
        # tab that has the event taxonomy", not just "any one of these" (e.g.
        # naming a tab that only has user properties will bounce back to
        # needs_mapping again).
        err.hint = (
            "Re-specify --sheet with the exact name of the tab that holds the event "
            f"taxonomy (the one with an event name column, etc.): {', '.join(sheets)} "
            "(a tab with only user properties is not a valid target. Also watch for "
            "leading/trailing whitespace and typos)"
        )
        raise err
    events, common_parameters, user_properties, unresolved = [], [], [], []
    absorbed_common = []
    event_sheets = []
    event_unmapped, event_mapping = [], []
    found_event_sheet = False
    # A list, not a dict, and every entry carries the sheet it came from. Each
    # tab is interpreted on its own — the same key reads as a header on one tab
    # and as a column letter on another — so merging the per-sheet dicts let the
    # last tab overwrite the rest and the earlier interpretations vanished.
    # Silent reinterpretation is exactly what this field exists to expose, and
    # unnamed_columns (added alongside it) already carries `sheet`.
    map_resolution = []
    unnamed_columns = []
    for name, rows in sheets.items():
        if not rows:
            continue
        # Not necessarily row 0 — see find_header_row.
        header_idx = find_header_row(rows, overrides)
        header = rows[header_idx]
        data_rows = rows[header_idx + 1:]
        emap, e_unmapped, e_res = _apply_overrides(
            header, EVENT_FIELD_ALIASES, overrides, apply_event_context_rules)
        umap, _u_unmapped, u_res = _apply_overrides(
            header, USER_PROP_FIELD_ALIASES, overrides, apply_user_prop_context_rules)
        is_event = "event_label" in emap or "ga4_name" in emap
        if sheet_name is not None and name != sheet_name:
            is_event = False  # Only the tab named by --sheet is treated as the event sheet.
        is_up = "up_name" in umap
        # The two passes cannot disagree about one key on one sheet: each --map
        # key belongs to exactly one alias dictionary, and the other pass skips
        # it (`field not in valid_here`). So this merge is per sheet only.
        #
        # Reported after the two `is_` decisions, not before, because a mapping
        # this tab is never harvested with reads nothing regardless of where the
        # key pointed. Measured: `--map "E=up_ga4_name"` on an events-only tab
        # reported `read_as: "column E"` with user_property_count 0 —
        # build_user_properties never ran there. The entry described the intent
        # and the reader had no way to tell it apart from a mapping that landed.
        event_unused = UNUSED_OTHER_SHEET if (
            sheet_name is not None and name != sheet_name) else UNUSED_NO_EVENTS
        sheet_res = {}
        for key, read_as in e_res.items():
            sheet_res[key] = read_as if is_event else _unused_resolution(read_as, event_unused)
        for key, read_as in u_res.items():
            sheet_res[key] = read_as if is_up else _unused_resolution(
                read_as, UNUSED_NO_USER_PROPS)
        for key, read_as in sheet_res.items():
            map_resolution.append({"sheet": name, "key": key, "read_as": read_as})
        if is_event:
            found_event_sheet = True
            event_sheets.append(name)
            event_unmapped.extend(e_unmapped)
            event_mapping.extend(k for k in emap if k not in event_mapping)
            evs, commons, absorbed = build_events(data_rows, emap)
            events.extend(evs)
            common_parameters.extend(commons)
            absorbed_common.extend(absorbed)
        if is_up:
            user_properties.extend(build_user_properties(data_rows, umap))
        if not is_event and not is_up:
            unresolved.append({
                "sheet": name,
                "headers": [str(h).strip() for h in header if str(h).strip()],
                "detected_event": emap,
            })
        for col in describe_unnamed_columns(header, data_rows):
            unnamed_columns.append({"sheet": name, **col})
    # Even if the event tab has no type column, fill it in from a reference tab
    # that only collects types, if one exists. The event tabs themselves are
    # excluded — their types were already read row by row.
    types = collect_param_types(sheets, skip=set(event_sheets))
    typed_count = apply_param_types(events, common_parameters, types)

    return {
        "events": events,
        "common_parameters": common_parameters,
        "absorbed_common": absorbed_common,
        "user_properties": _dedupe_by_name(user_properties),
        "found_event_sheet": found_event_sheet,
        "unresolved": unresolved,
        "event_sheets": event_sheets,
        "event_unmapped": event_unmapped,
        "event_mapping": event_mapping,
        "param_types_from_reference": typed_count,
        "case_only_duplicate_events": find_case_only_duplicate_events(events),
        "unrecognized_scopes": find_unrecognized_scopes(events, common_parameters),
        "map_resolution": map_resolution,
        "unnamed_columns": unnamed_columns,
    }


def parse_file(path, overrides=None, sheet_name=None) -> dict:
    sheets = read_sheets_from_file(Path(path))
    if not sheets or all(not r for r in sheets.values()):
        raise ValueError("The file is empty.")
    if sheet_name is not None and set(sheets) == {CSV_SHEET_KEY}:
        # csv only ever has one tab, so --sheet is meaningless. Rather than
        # exposing the placeholder key ("(csv)") in the error as-is, reject it
        # with a clear explanation of why it isn't needed — silently ignoring it
        # could leave the user unsure whether the tab they specified actually
        # took effect.
        err = ValueError("This file has only one tab. Re-run without the --sheet option.")
        err.hint = "A csv file has no separate tabs. Re-run without --sheet."
        raise err
    return build_from_sheets(sheets, overrides, sheet_name)


# ---- Output -----------------------------------------------------------------

def _md_cell(value) -> str:
    """Makes a single table cell safe for markdown.

    Real-world taxonomies have had example values containing `|` (e.g. "...
    consulting | Ogaeng Marketing"), which broke the table. Line breaks are
    handled the same way, since they'd also split a row.
    """
    text = "" if value is None else str(value)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("|", "\\|")
    return text.replace("\n", "<br>")


# taxonomy.md is an interface consumed by ga-use. Writing only the parameter
# name naturally leads to querying it as `customEvent:<name>`, which produced a
# 400 in practice:
#   customEvent:method   -> "Field customEvent:method is not a valid dimension"
#     (method is a GA4 **standard dimension** and must not get a prefix)
#   customEvent:event_id -> unregistered, so it can't be queried at all (a
#     parameter that appeared in 14 of 31 taxonomy events)
# So the table also carries "what is this parameter actually called, and can it
# be queried" for each one. The determination uses only the local file (no API
# call needed) — if custom_definitions.json is absent, it says registration
# status is unknown rather than pretending to know.
QUERY_NAME_UNKNOWN = "Needs confirmation"


# Same threshold taxonomy_diff uses for the collected-events cache. Both files
# are snapshots of live GA4 state, so they go stale the same way.
STALE_REGISTRY_DAYS = 7


def _registry_freshness_warning(registry):
    """Warns when the custom-definition snapshot is too old to trust, or undated.

    This registry decides what every Query Name in taxonomy.md says. A parameter
    registered in GA4 after the snapshot still reads "Not registered — cannot
    query", which sends the marketer to register something they already have;
    one deleted since still reads as registered, and the query 400s later.
    Neither is visible from taxonomy.md itself.

    collected_events.json has carried a timestamp and a staleness hint for a
    while; this file was written without one, so the same failure had no way of
    being noticed. Silence when the registry is simply absent — the Query Name
    already says "Needs confirmation" in that case, which is the honest answer.
    """

    if not isinstance(registry, dict):
        return None
    fetched = registry.get("fetched_at")
    if not fetched:
        return ("The custom-definition registry has no collection timestamp (older format), "
                "so there is no way to tell how far behind GA4 it is. Every "
                "\"Not registered — cannot query\" in taxonomy.md rests on it. "
                "Re-fetch with custom_dims.py fetch and re-parse.")
    try:
        when = datetime.fromisoformat(str(fetched))
    except ValueError:
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - when).days
    if age < STALE_REGISTRY_DAYS:
        return None
    return (f"The custom-definition registry is {age} day(s) old. Anything registered in GA4 "
            "since then still reads \"Not registered — cannot query\" here, and anything "
            "deleted since then still reads as registered. Re-fetch with "
            "custom_dims.py fetch and re-parse before acting on those labels.")


def _load_registry():
    """Reads custom_definitions.json if present. Returns None if missing or corrupt."""
    path = custom_definitions_path()
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def query_name(name, scope, registry):
    """Builds a one-line description of the name (and caveats) actually used to query a parameter."""
    import param_naming

    try:
        info = param_naming.classify_parameter(name, scope, registry or {})
    except ValueError:
        return QUERY_NAME_UNKNOWN
    if info["api_names"]:
        label = info["api_names"][0]
        if info["kind"] == "metric":
            label = f"{label} (metric)"
        # A standard field exists for something registered as a custom
        # definition. Naming it here is the only place a reader would find out:
        # the custom dimension holds no data from before it was registered, so
        # querying through it silently drops earlier periods that the standard
        # field covers in full.
        alternative = info.get("standard_dimension") or info.get("standard_metric")
        if alternative:
            return f"{label} — prefer standard {alternative}"
        return label
    if info.get("standard_dimension"):
        # A standard dimension is used as-is, without the customEvent: prefix —
        # adding it causes a 400.
        suffix = ", item scope" if scope == "item" else ""
        return f"{info['standard_dimension']} (standard{suffix})"
    if info.get("standard_metric"):
        # No equivalent dimension exists — only an aggregate. Naming it plainly
        # keeps ga-use from querying a raw per-event/per-item value that cannot
        # be returned.
        #
        # The scope is derived, not hardcoded. It used to read "item scope"
        # unconditionally, which was true while item metrics were the only kind;
        # adding the event-scope ones (value/shipping/tax) made it print
        # "eventValue (aggregate metric, item scope)" — a label that sends the
        # reader looking for an items-array field that does not exist.
        suffix = ", item scope" if scope == "item" else ", event scope"
        return f"{info['standard_metric']} (aggregate metric{suffix})"
    # Reserved before the registry check: this verdict does not depend on what is
    # registered today, and without it the label reads "Not registered — cannot
    # query", which invites a registration request GA4 will reject.
    if info["classification"] == "reserved_not_registerable":
        return "Reserved name — cannot be registered or queried"
    if registry is None:
        prefix = {"item": "customItem", "user": "customUser"}.get(scope, "customEvent")
        return f"{prefix}:{name} ({QUERY_NAME_UNKNOWN})"
    return "Not registered — cannot query"


PARAM_TABLE_HEADER = ("| Parameter | Query Name | Type | Description | Example Value |",
                      "|---|---|---|---|---|")


def _param_row(p, registry):
    """One parameter's markdown row. Shared by the per-event and common tables.

    These were two identical copies. The column set and the scope-resolution
    rule are one decision, and this change had to edit both of them — which is
    the cost the duplication was charging.
    """
    import param_naming

    try:
        scope, _ambiguous = param_naming.resolve_scope(p["name"], p.get("scope"), registry)
    except ValueError:
        scope = p.get("scope")  # query_name catches it and returns Needs confirmation
    return (f"| {_md_cell(p['name'])} "
            f"| {_md_cell(query_name(p['name'], scope, registry))} "
            f"| {_md_cell(p['type'])} "
            f"| {_md_cell(p['description'])} | {_md_cell(p['example'])} |")


def to_markdown(events, user_properties, common_parameters=None, registry=None):
    import param_naming

    lines = ["# Event Taxonomy", ""]
    if registry is None:
        lines.append("> `Needs confirmation` in the Query Name column means this could not "
                     "be determined because custom definition registration status "
                     "(`custom_definitions.json`) isn't available. Fetch it with "
                     "`custom_dims.py fetch` to fill it in.")
    else:
        lines.append("> `(standard)` means a GA4 standard dimension used as-is without a "
                     "prefix, `(metric)` means it's registered as a metric and belongs in "
                     "metrics, and `Not registered — cannot query` means it cannot be "
                     "queried until registered as a custom definition.")
    lines.append("")
    by_cat, order = {}, []
    for ev in events:
        c = ev["category"] or "(Uncategorized)"
        if c not in by_cat:
            by_cat[c] = []
            order.append(c)
        by_cat[c].append(ev)
    for c in order:
        lines.append(f"## Category: {c}")
        lines.append("")
        for ev in by_cat[c]:
            title = ev["ga4_name"]
            if ev["label"] and ev["label"] != ev["ga4_name"]:
                title += f" (label: {ev['label']})"
            lines.append(f"### {title}")
            if ev["description"]:
                lines.append(ev["description"])
            lines.append("")
            if ev["parameters"]:
                lines.extend(PARAM_TABLE_HEADER)
                for p in ev["parameters"]:
                    lines.append(_param_row(p, registry))
                lines.append("")
    if common_parameters:
        lines.append("## Common Parameters")
        lines.append("")
        lines.extend(PARAM_TABLE_HEADER)
        for p in common_parameters:
            lines.append(_param_row(p, registry))
        lines.append("")
    if user_properties:
        lines.append("## User Properties")
        lines.append("")
        lines.append("| Property | Label | Type | Description | Example Value |")
        lines.append("|---|---|---|---|---|")
        for up in user_properties:
            lines.append(
                f"| {_md_cell(up['name'])} | {_md_cell(up.get('label') or '')} "
                f"| {_md_cell(up['type'])} "
                f"| {_md_cell(up['description'])} | {_md_cell(up['example'])} |"
            )
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


# Parsing wholesale replaces the existing taxonomy. Parsing the wrong file/sheet
# once wipes out everything accumulated so far, so a copy is kept before
# overwriting. A single backup (taxonomy.json.bak) would get overwritten by a
# second bad parse in a row and become useless, so the last BACKUP_KEEP
# generations are kept.
#
# The backup unit is a timestamped **folder**, not a file. Rolling back only the
# json would leave taxonomy.md (which ga-use reads) broken, so the moment you
# think you've recovered, you'd actually be analyzing against a corrupted
# taxonomy. Both artifacts must be bundled as one generation.
BACKUP_DIR_NAME = "taxonomy_backups"
BACKUP_KEEP = 5
# Only folders matching this shape are cleaned up — a folder a human created
# separately is never deleted.
BACKUP_STAMP_GLOB = "[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]*"


def countable_len(value):
    """How many real entries a taxonomy section holds, or None if unreadable.

    `len(value or [])` counted anything with a length: a corrupt
    `{"events": "not a list"}` reported 5 — the string's character count —
    and `[null, 5]` reported 2. That matters because both callers feed a
    decision the SKILL.md tells the user to make on these numbers: choosing
    which backup generation to restore, and judging whether a re-parse that
    took 31 events down to 1 was a mistake. A plausible-looking count is
    worse than no count there.

    None means "couldn't tell", matching ga_journey's taxonomy_event_count,
    so the two never disagree about the same file.
    """
    if not isinstance(value, list):
        return None
    return sum(1 for v in value if isinstance(v, dict))


def _counts_of(data):
    return {
        "event_count": countable_len(data.get("events")),
        "common_parameter_count": countable_len(data.get("common_parameters")),
        "user_property_count": countable_len(data.get("user_properties")),
        "source": data.get("source"),
    }


def backup_existing():
    """Copies the existing outputs into a timestamped folder and returns (folder path, previous counts).

    Returns (None, None) if there was no existing taxonomy.json. Even if the file
    is corrupted and can't be read, a copy is still kept, with counts as None —
    preserving a way to roll back matters more than reporting counts.
    A failed backup doesn't block parsing itself (returns None), but doesn't
    pretend to have succeeded either.
    """
    current = taxonomy_json_path()
    if not current.exists():
        return None, None

    try:
        previous = json.loads(current.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        previous = None
    counts = _counts_of(previous) if isinstance(previous, dict) else None

    try:
        backup_root = ga4_dir() / BACKUP_DIR_NAME
        backup_root.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        dest = backup_root / stamp
        # Running twice within the same second collides on the name and
        # overwrites the previous backup. A suffixed name sorts after the plain
        # one (the prefix is shorter), so chronological order is preserved.
        suffix = 1
        while dest.exists():
            dest = backup_root / f"{stamp}-{suffix}"
            suffix += 1
        dest.mkdir(parents=True)

        # json and md are bundled as one generation. md may not exist (an older
        # state), so only copy it if present.
        (dest / current.name).write_bytes(current.read_bytes())
        md = taxonomy_md_path()
        if md.exists():
            (dest / md.name).write_bytes(md.read_bytes())
    except OSError:
        # Disk full, no permission, the backup path exists as a file, etc.
        # Instead of showing the marketer a stack trace, report "no backup" and
        # continue parsing.
        return None, counts

    # Clean up old generations. Folder names are timestamps, so lexical order == chronological order.
    try:
        generations = sorted(p for p in backup_root.glob(BACKUP_STAMP_GLOB) if p.is_dir())
    except OSError:
        generations = []
    for old in generations[:-BACKUP_KEEP]:
        for f in old.glob("*"):
            try:
                f.unlink()
            except OSError:
                pass
        try:
            old.rmdir()
        except OSError:
            pass

    return dest, counts


def _load_saved_parse_options(source_label) -> dict:
    """Column map / sheet name saved with the previous taxonomy, if it was the same source.

    Returns {} on anything unexpected — a missing file, unreadable JSON, a
    different source, or a column_map that isn't a string->string mapping. This
    runs before parsing and silently changes how columns are read, so anything
    it cannot fully vouch for has to be ignored rather than half-applied.
    """
    try:
        data = json.loads(taxonomy_json_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict) or data.get("source") != source_label:
        return {}
    out = {}
    saved_map = data.get("column_map")
    if isinstance(saved_map, dict) and saved_map and all(
            isinstance(k, str) and isinstance(v, str) for k, v in saved_map.items()):
        out["column_map"] = saved_map
    if isinstance(data.get("sheet_name"), str) and data["sheet_name"]:
        out["sheet_name"] = data["sheet_name"]
    return out


def write_outputs(source, result, column_map=None, sheet_name=None):
    """Writes the outputs and returns (data, replaced). replaced describes the previous taxonomy that was replaced.

    column_map/sheet_name are stored so the same sheet can be re-synced without
    them. A taxonomy whose columns needed --map used to record only its source,
    so every later re-sync of that same sheet failed the same way and the author
    had to reconstruct the mapping from the error message. The taxonomy is meant
    to be re-parsed whenever the sheet changes, so that cost recurs forever.
    """
    ga4_dir().mkdir(parents=True, exist_ok=True)
    backup_path, previous_counts = backup_existing()

    data = {
        "source": source,
        # The last of the four .ga4 snapshots to get a timestamp — config.json,
        # collected_events.json and custom_definitions.json all carried one, and
        # this file did not, which is the shape of gap this project keeps
        # finding: a pattern applied everywhere except one place.
        #
        # Milder than the registry case, because taxonomy_diff compares against
        # live GA4 and will surface events the sheet has gained since. But the
        # mapping ga-use reads comes from here, so "how old is this picture of
        # the sheet" is worth being answerable without guessing from file mtime.
        "parsed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "events": result["events"],
        "common_parameters": result.get("common_parameters", []),
        "user_properties": result.get("user_properties", []),
    }
    # Written only when non-empty, so a taxonomy that never needed a mapping
    # doesn't grow keys that read as "a mapping was required here".
    if column_map:
        data["column_map"] = dict(column_map)
    if sheet_name:
        data["sheet_name"] = sheet_name
    taxonomy_json_path().write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    taxonomy_md_path().write_text(
        to_markdown(
            result["events"],
            result.get("user_properties", []),
            result.get("common_parameters", []),
            # If custom definition registration status is available, write the
            # exact query name. If not, say it's unknown.
            registry=_load_registry(),
        ),
        encoding="utf-8",
    )

    replaced = None
    if previous_counts is not None or backup_path is not None:
        replaced = dict(previous_counts or {})
        # backup is the generation folder path. If None, no backup could be made,
        # which must be read as "there is no way to roll back" (a null path must
        # never be presented as a recovery instruction).
        replaced["backup"] = str(backup_path) if backup_path else None
    return data, replaced


# ---- CLI --------------------------------------------------------------------

def _is_sheets_url(s: str) -> bool:
    return s.startswith("http") and "docs.google.com/spreadsheets" in s


def main(argv=None):
    ap = argparse.ArgumentParser(description="Parse an event taxonomy")
    ap.add_argument("source", help="An xlsx/xls/csv file path or a Google Sheets URL")
    ap.add_argument("--map", dest="map_arg", default="",
                    help='Explicit header mapping. Example: --map "Event Name=event_label,Action Key=ga4_name"')
    ap.add_argument("--sheet", dest="sheet_name", default=None,
                    help="The event-taxonomy tab's name among several tabs. Example: --sheet \"GA4\"")
    args = ap.parse_args(argv)
    overrides = parse_map_arg(args.map_arg)
    # The full resolved path, not the basename. `taxonomy.csv` and
    # `event_taxonomy.xlsx` are ordinary names, so `2025/taxonomy.csv` and
    # `2026/taxonomy.csv` compared equal and last year's column mapping was
    # silently applied to this year's sheet — the precise failure the comment
    # below warns about, let through by the gate meant to prevent it.
    source_label = (args.source if _is_sheets_url(args.source)
                    else str(Path(args.source).expanduser().resolve()))
    # Fall back to the mapping saved with the previous taxonomy — but only when
    # it describes the SAME source. A mapping is a statement about one sheet's
    # column headers; applying it to a different sheet would not error, it would
    # map the wrong columns and produce a taxonomy that looks fine. An explicit
    # --map always wins, so this can never override what the caller asked for.
    reused_map = reused_sheet = False
    if not overrides or args.sheet_name is None:
        saved = _load_saved_parse_options(source_label)
        if not overrides and saved.get("column_map"):
            overrides = saved["column_map"]
            reused_map = True
        if args.sheet_name is None and saved.get("sheet_name"):
            args.sheet_name = saved["sheet_name"]
            reused_sheet = True
    try:
        if _is_sheets_url(args.source):
            import sheets_reader
            sheets = sheets_reader.fetch_sheets(args.source)
            result = build_from_sheets(sheets, overrides, sheet_name=args.sheet_name)
        else:
            result = parse_file(args.source, overrides, sheet_name=args.sheet_name)
    except Exception as e:  # noqa: BLE001 - convert parse/read errors into a friendly JSON payload
        # If the exception carries its own .hint (sheet not found, --sheet with
        # csv, etc.), use it as the top priority regardless of path (local/URL) —
        # since build_from_sheets is called from both paths, blanket-classifying
        # the URL path with format_api_error would leak even a local validation
        # failure (like a typo'd tab name) into a nonsensical "check your
        # authentication status" hint (an actual bug that occurred).
        hint = getattr(e, "hint", None)
        if hint is not None:
            payload = {"ok": False, "error": str(e), "hint": hint}
        elif isinstance(e, ModuleNotFoundError):
            # Running with the system python3 instead of the venv (xlsx needs
            # openpyxl, a URL needs googleapiclient). Common to both the
            # local/URL paths, so caught before the branches below — falling
            # through to them would give a nonsensical hint like "check whether
            # the file is corrupted" or "check your authentication status".
            payload = format_api_error(e)
        elif _is_sheets_url(args.source):
            # Only the remaining errors without their own hint (API/auth errors, etc.) go to the generic classifier.
            payload = format_api_error(e)
        else:
            # A hint-less error from a local file (a corrupted file, etc.) still
            # gets a minimal next step — never send the marketer away empty-handed.
            payload = {
                "ok": False,
                "error": str(e),
                "hint": "Check that the file isn't corrupted and that its extension is xlsx/xls/csv, then try again.",
            }
        print(json.dumps(payload, ensure_ascii=False))
        sys.exit(1)

    if args.sheet_name is None and len(result["event_sheets"]) > 1:
        print(json.dumps({
            "ok": False,
            "needs_sheet_choice": True,
            "error": "Several tabs look like an event taxonomy.",
            "candidates": result["event_sheets"],
            "hint": 'Re-run with --sheet specifying which tab is the event taxonomy. '
                    'Example: --sheet "GA4"',
        }, ensure_ascii=False))
        sys.exit(1)

    if not result["found_event_sheet"]:
        needs_mapping_payload = {
            "ok": False,
            "needs_mapping": True,
            "error": "Could not automatically recognize the event sheet.",
            "sheets": result["unresolved"],
            "hint": 'Map each column to a canonical field and re-run with --map. '
                    'Example: --map "Event Name=event_label,GA4 Event Name=ga4_name". '
                    'Canonical fields: category,event_label,ga4_name,event_description,'
                    'param_name,param_type,param_description,param_example,param_scope',
        }
        if result.get("unnamed_columns"):
            needs_mapping_payload["unnamed_columns"] = result["unnamed_columns"]
        # Carried on the failure too, not just on success. This is the response a
        # --map run lands on when the keys missed, so it is exactly where "your
        # key was read as nothing" has to be visible — otherwise the only advice
        # available is "try --map again", which is what just failed.
        if result.get("map_resolution"):
            needs_mapping_payload["map_resolution"] = result["map_resolution"]
        print(json.dumps(needs_mapping_payload, ensure_ascii=False))
        sys.exit(1)

    param_total = sum(len(e["parameters"]) for e in result["events"]) \
        + len(result.get("common_parameters", []))
    suspicious = [h for h in result.get("event_unmapped", []) if looks_like_param_column(h)]
    if "param_name" not in result.get("event_mapping", []) and suspicious and param_total == 0:
        needs_mapping_payload = {
            "ok": False,
            "needs_mapping": True,
            "error": "Parameter columns were not recognized; 0 parameters were parsed.",
            "unmapped_headers": result["event_unmapped"],
            "mapped_fields": sorted(result["event_mapping"]),
            "hint": 'The event columns were recognized but the parameter columns were not, '
                    'so every parameter was dropped. Re-run with --map to assign them. '
                    'Example: --map "매개변수(이벤트 속성)=param_name,매개변수(이벤트 속성) 값=param_description". '
                    'Canonical fields: param_name,param_type,param_description,param_example,param_scope',
        }
        if result.get("unnamed_columns"):
            needs_mapping_payload["unnamed_columns"] = result["unnamed_columns"]
        if result.get("map_resolution"):
            needs_mapping_payload["map_resolution"] = result["map_resolution"]
        print(json.dumps(needs_mapping_payload, ensure_ascii=False))
        sys.exit(1)

    _data, replaced = write_outputs(
        source_label, result, column_map=overrides, sheet_name=args.sheet_name
    )
    payload = {
        "ok": True,
        "event_count": len(result["events"]),
        "common_parameter_count": len(result.get("common_parameters", [])),
        "user_property_count": len(result["user_properties"]),
        "json": str(taxonomy_json_path()),
        "md": str(taxonomy_md_path()),
    }
    # Say so when options came from the saved taxonomy rather than the command
    # line. These change how columns are read, and an option applied silently is
    # one nobody can question when the result looks subtly wrong.
    if reused_map:
        payload["reused_column_map"] = dict(overrides)
    if reused_sheet:
        payload["reused_sheet_name"] = args.sheet_name
    if result.get("unnamed_columns"):
        payload["unnamed_columns"] = result["unnamed_columns"]
    # How each --map key was actually read, **per sheet**: matched against
    # header text, fell through to addressing a column by letter, or refused —
    # see the RESOLUTION_* constants for every value and why each exists. A key
    # that matched nothing is itself an entry now, so an empty list means only
    # one thing: no --map was in force. That case shouldn't grow a key just to
    # say so — matching how column_map/sheet_name are already handled above.
    if result.get("map_resolution"):
        payload["map_resolution"] = result["map_resolution"]
    # If an existing taxonomy was replaced, report the previous counts alongside
    # it — so the skill can immediately notice an accident like 31 events
    # becoming 1 (parsing the wrong file/sheet) and tell the user.
    if replaced is not None:
        payload["replaced"] = replaced
    # Things the author should look at before moving on. Parsing succeeded, so
    # these are questions for them, not failures — but each one silently
    # corrupts a later step if ignored, so they must not be buried.
    warnings = []
    dupes = result.get("case_only_duplicate_events") or []
    if dupes:
        payload["case_only_duplicate_events"] = dupes
        warnings.append(
            "These event names differ only by letter case, so they were kept as separate "
            f"events and their parameters were split between them: "
            f"{'; '.join(' vs '.join(v) for v in dupes)}. "
            "That is usually a typo in the sheet rather than two real events — GA4 sends one "
            "exact name. Confirm which casing is actually being collected, make the sheet use "
            "only that one, and re-parse. Left as is, the unused casing will show up as "
            '"defined but not collected" when you compare against live data.'
        )
    unrec = result.get("unrecognized_scopes") or []
    if unrec:
        payload["unrecognized_scopes"] = [
            {"parameter": name, "value": raw} for name, raw in unrec
        ]
        warnings.append(
            "The scope column was filled in with a value this parser doesn't recognize, so "
            "those parameters ended up with no scope: "
            f"{'; '.join(f'{name} = {raw!r}' for name, raw in unrec)}. "
            f"Recognized values are: {', '.join(SCOPE_VOCABULARY)}. "
            "Fix the sheet to use one of those (or prefix the parameter name with `items.` for "
            "item scope) and re-parse — otherwise the comparison step will report these as "
            '"scope not stated" and suggest adding a scope column you already have.'
        )
    # A parse that produced nothing "succeeded" only in the narrowest sense.
    # The realistic cause is pointing at a taxonomy TEMPLATE — headers filled
    # in, no rows yet — which is a very natural thing to hand over when asked
    # for "our taxonomy sheet". Left unflagged, taxonomy.md is written with no
    # events in it, the journey check reports a taxonomy as present, and the
    # user is routed on to analysis with nothing to map their questions
    # against. This mirrors the existing `replaced` guard, which already
    # treats a sharp drop in event_count as worth stopping for.
    if not result["events"] and not result["user_properties"]:
        warnings.append(
            "No events or user properties were found — the sheet's columns were recognized, "
            "but every data row underneath was empty. This usually means the file is still "
            "an unfilled template, or the wrong tab was read. taxonomy.md has been written "
            "with no events in it, so analysis would have nothing to map questions against. "
            "Check the file and re-parse before moving on."
        )
    absorbed = result.get("absorbed_common") or []
    if absorbed:
        listed = ", ".join(f"{p} -> {ev}" for ev, p in absorbed[:6])
        warnings.append(
            f"{len(absorbed)} parameter(s) sit under a category that reads like a shared/common "
            f"block, but were attached to an event because of where they are in the sheet "
            f"({listed}). A common-parameter block is only kept separate when it sits **above "
            "the first event**; below or between events it becomes that event's parameters, "
            "silently. If these apply to every event, move the block above the first event and "
            "re-parse — otherwise analysis will think only that one event carries them."
        )
    # The one check that turns this class of failure from silent into visible.
    # Everything else in this list warns about a plan that is wrong; this warns
    # that the parse itself read the wrong column.
    invalid = find_invalid_ga4_names(
        result["events"], result.get("common_parameters"), result["user_properties"])
    if invalid:
        listed = "; ".join(
            f"{group} ({len(names)}): " + ", ".join(names[:6])
            + ("…" if len(names) > 6 else "")
            for group, names in invalid.items())
        warnings.append(
            "These names cannot be GA4 identifiers — a GA4 name starts with a letter and "
            f"holds only letters, digits and underscores: {listed}. The usual cause is a "
            "sheet that keeps the human-readable label in one column and the GA4 name in "
            "another, where only the label column was recognized. Check the sheet's columns "
            "before passing any of this on: if a name column exists, map it with --map and "
            "re-parse. Left as is, the comparison step reports every one of these as 'not "
            "registered', which reads as a broken implementation rather than a parsing "
            "mistake."
        )
    # Common parameters get the same treatment as event parameters here. They
    # ride on every event, so an items-array name left unscoped in the common
    # block flips the answer on every event at once — find_unrecognized_scopes
    # already looked at them, and these two skipping the block was an
    # inconsistency, not a decision.
    unscoped_items = find_unscoped_item_fields(
        result["events"], result.get("common_parameters"))
    if unscoped_items:
        listed = "; ".join(f"{ev}: {', '.join(names)}" for ev, names in unscoped_items)
        warnings.append(
            "These parameters are named after ecommerce items-array fields but have no scope "
            f"stated, so they defaulted to event scope — {listed}. That flips the answer rather "
            "than nudging it: on this same taxonomy, item_id scoped as an item resolved to the "
            "standard itemId dimension while the unscoped one resolved to customEvent:item_id, "
            "and price went from itemRevenue to \"cannot query\". A bare item_name sent as a "
            "direct event parameter is genuinely a different value from itemName in the items "
            "array, so this is not a naming quibble. Fill in the scope column (item) and "
            "re-parse — unless these really are event-level parameters, which happens on "
            "non-ecommerce events."
        )
    warnings.extend(find_limit_violations(result["events"], result.get("user_properties"),
                                          result.get("common_parameters")))
    registry_warning = _registry_freshness_warning(_load_registry())
    if registry_warning:
        warnings.append(registry_warning)
    if warnings:
        payload["warnings"] = warnings
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
