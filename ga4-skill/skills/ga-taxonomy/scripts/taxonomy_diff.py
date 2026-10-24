"""[stdlib] Reconciles the taxonomy (taxonomy.json) against real collected data
(collected_events.json) at the event-name level and reports the result.
Pure logic — no API access.
"""
import difflib
import json
import sys
from datetime import datetime, timezone

import param_naming
import taxonomy_schema
from ga4_common import (
    collected_events_path,
    custom_definitions_path,
    sibling_script,
    taxonomy_json_path,
)


# How close two names must be to count as a match. Loose enough to catch
# typos/renames (cosulting <-> consulting), tight enough that unrelated
# events don't get paired up.
NEAR_MISS_CUTOFF = 0.85

# GA4 automatically collected + enhanced measurement events (web and app
# stream). taxonomy_schema.AUTO_COLLECTED_EVENTS is the single source of
# truth (also used by taxonomy_draft.py) — see its docstring/comment there.
#
# Why this matters: without the split, a real property showed 15 undefined
# events of which 12 were these. The 3 that actually needed documenting
# (add_shipping_info, page_loaded, private_form_submit_click) were buried.
AUTO_COLLECTED_EVENTS = frozenset(taxonomy_schema.AUTO_COLLECTED_EVENTS)


def find_near_misses(not_seen, undefined):
    """Try to pair names that are in the taxonomy but weren't seen with names
    that were collected but aren't defined.

    Real-world case: the taxonomy had `click_button_cosulting_group` (a typo),
    while what was actually being collected was `click_button_consulting_group`.
    That's not a "missing implementation" — it's a spelling mismatch. But if you
    just list the two buckets separately, this gets buried among everything else
    and nobody notices.
    """
    pairs = []
    for name in not_seen:
        close = difflib.get_close_matches(name, undefined, n=1, cutoff=NEAR_MISS_CUTOFF)
        if close:
            pairs.append({"defined": name, "collected": close[0]})
    return pairs


def diff_events(defined_names, collected_names):
    defined = set(defined_names)
    collected = set(collected_names)
    not_seen = sorted(defined - collected)
    undefined_all = collected - defined
    # Auto-collected events are expected to be absent from a taxonomy, so
    # leaving them in the main bucket drowns the events that genuinely need
    # documenting. They are reported separately rather than dropped.
    undefined = sorted(n for n in undefined_all if n not in AUTO_COLLECTED_EVENTS)
    auto = sorted(n for n in undefined_all if n in AUTO_COLLECTED_EVENTS)
    out = {
        "defined_and_collected": sorted(defined & collected),
        # Mind the name: this means "wasn't seen within this query window (days)",
        # not "isn't implemented". In real measurements, 9 out of 14 flagged events
        # turned out to be working fine (one even had 474 hits over a 365-day
        # window). A 30-day window catches low-frequency events wholesale. The old
        # name `defined_but_missing` asserted a fact that wasn't true and sent
        # people off to investigate code that was working perfectly.
        "defined_not_seen_recently": not_seen,
        "collected_but_undefined": undefined,
        "auto_collected_undocumented": auto,
    }
    # Near-miss pairing runs only against the real signal. An auto-collected
    # name like `form_submit` would otherwise get paired with a taxonomy entry
    # `form_submitted` and be reported as a typo that isn't one.
    near = find_near_misses(not_seen, undefined)
    if near:
        out["near_misses"] = near
    return out


# Beyond this age, the diff result is hard to trust. If the whole days=30 window
# has drifted into the past, even events that are collecting fine right now show
# up as "not seen".
STALE_CACHE_DAYS = 7


def _cache_freshness(collected):
    """Reports how old the collected-events cache is.

    If the cache has no collection timestamp (old format), freshness can't be
    determined — rather than guessing, we say "unknown". `days` is the window's
    **width**, not its position, so without a timestamp there's no way to tell
    an 8-month-old 30-day snapshot from one pulled today.
    """
    fetched = collected.get("fetched_at")
    if not fetched:
        return {
            "cache_fetched_at": None,
            "cache_hint": "The collected-events cache has no collection timestamp (old format). "
                          "Since we can't tell how old it is, it's safer to re-fetch it with ga4_events.py list.",
        }
    out = {"cache_fetched_at": fetched}
    try:
        when = datetime.fromisoformat(str(fetched))
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - when).days
    except ValueError:
        return out
    out["cache_age_days"] = age
    if age >= STALE_CACHE_DAYS:
        out["cache_hint"] = (
            f"The collected-events cache is {age} day(s) old. Events that started "
            "collecting since then will still show up as 'not seen', so re-fetch "
            "with ga4_events.py list and reconcile again."
        )
    return out


def _event_names(obj):
    events = obj.get("events", [])
    if not isinstance(events, list):
        return []
    names = []
    for e in events:
        if not isinstance(e, dict):
            continue
        name = e.get("ga4_name") or e.get("label") or e.get("name")
        if name:
            names.append(name)
    return names


def _defined_parameters(taxonomy):
    """Returns the taxonomy's (name, scope) pairs, deduplicated while preserving order.

    Custom definitions are property-wide, not per-event, so the same parameter
    appearing in multiple events is only classified once. Common parameters that
    don't belong to any specific event are counted as "defined" the same way.
    Doesn't crash on a corrupt taxonomy (same degrade policy as _event_names).

    A parameter's scope is unstated (None) when the sheet gave no `items.`
    prefix and no scope column value for that occurrence. A name's first
    occurrence in the source order may be an unstated one while a later
    occurrence states a real scope (e.g. `quantity` written bare in
    `add_to_cart` but as `items.quantity` in `view_cart`) -- keeping "whichever
    came first" as GA4's own classify-once rule would then keep the unstated
    None and silently discard every later stated scope. So: a stated scope
    always beats an unstated one for the same name, regardless of arrival
    order; among occurrences that both state a scope, the first one still
    wins. The position of each name in the returned list still reflects where
    it was first seen, not where its winning scope value came from.
    """
    first_index = {}
    out = []

    def _collect(params):
        for p in params if isinstance(params, list) else []:
            if not isinstance(p, dict):
                continue
            name = p.get("name")
            if not name:
                continue
            # A missing key means an old taxonomy.json from before scopes
            # existed -> keep the previous behavior ('event'). An explicit
            # null means the parser looked and could not tell, so it is
            # passed through for registry-based resolution.
            scope = p["scope"] if "scope" in p else "event"
            if name not in first_index:
                first_index[name] = len(out)
                out.append((name, scope))
            else:
                idx = first_index[name]
                existing_scope = out[idx][1]
                if existing_scope is None and scope is not None:
                    out[idx] = (name, scope)
                # else: existing_scope is already stated (or this new
                # occurrence is also unstated), so it keeps its value. Two
                # occurrences that BOTH state a scope but disagree (e.g.
                # "item" in one event, "event" in another) is a genuine
                # taxonomy contradiction -- GA4 custom definitions are
                # property-wide, so only one can be right. This function does
                # not detect or report that case; it silently keeps whichever
                # stated value arrived first, same as it always has for
                # same-scope duplicates. Flagging real disagreements would
                # need a separate reporting channel, not a dedup-site fix.

    events = taxonomy.get("events")
    for ev in events if isinstance(events, list) else []:
        if not isinstance(ev, dict):
            continue
        _collect(ev.get("parameters"))
    _collect(taxonomy.get("common_parameters"))
    return out


def _defined_user_properties(taxonomy):
    """Returns the taxonomy's (name, scope) pairs, deduplicated while preserving order.

    Doesn't crash on a corrupt taxonomy (same degrade policy as _event_names).
    """
    seen, out = set(), []
    ups = taxonomy.get("user_properties")
    for up in ups if isinstance(ups, list) else []:
        if not isinstance(up, dict):
            continue
        name = up.get("name")
        if name and name not in seen:
            seen.add(name)
            out.append((name, up.get("scope") or "user"))
    return out


def _invalid_ga4_names(taxonomy):
    """Taxonomy names that cannot be GA4 identifiers, grouped by section.

    parse_taxonomy warns about these at parse time, but the warning lives only
    in that one response: nothing is recorded in taxonomy.json, and this script
    starts from the file. A later session that opens with "compare against live
    data" enters the comparison with no warning anywhere — which is the original
    incident exactly. Measured on a real taxonomy: 24 user properties, all
    correctly registered, every one reported as missing, and the advice that
    reached the marketer was to delete 12 of them.

    The verdict is a rule, not a guess (support.google.com/analytics/answer/
    13316687): a GA4 name starts with a letter and holds only letters, digits
    and underscores, so a name outside that shape can never have been collected
    or registered under it. Every comparison verdict about such a name is
    therefore meaningless rather than merely uncertain — which is why it is said
    here instead of being left for the reader to infer from a wall of
    "not registered".
    """
    out = {}
    if not isinstance(taxonomy, dict):
        return out
    valid = taxonomy_schema.is_valid_ga4_name
    groups = (
        ("events", _event_names(taxonomy)),
        ("parameters", [n for n, _scope in _defined_parameters(taxonomy)]),
        ("user_properties", [n for n, _scope in _defined_user_properties(taxonomy)]),
    )
    for key, names in groups:
        bad = list(dict.fromkeys(n for n in names if not valid(n)))
        if bad:
            out[key] = bad
    if out:
        out["hint"] = (
            "These names cannot be GA4 identifiers (a GA4 name starts with a letter and "
            "holds only letters, digits and underscores), so GA4 could never have "
            "collected or registered them under these names. Every verdict about them "
            "below is meaningless, not merely negative — do not report them as missing "
            "implementations or missing registrations. The usual cause is a taxonomy "
            "parsed from a sheet that keeps the human-readable label in one column and "
            "the GA4 name in another, where only the label column was recognized. "
            "Re-parse the sheet with the name column mapped and compare again:\n"
            f"  .ga4/venv/bin/python {sibling_script('ga-taxonomy', 'parse_taxonomy.py')} "
            '"<file or URL>" --map "<column letter>=up_ga4_name"'
        )
    return out


def parse_scope_vocabulary():
    """The scope words parse_taxonomy accepts, for quoting back in a hint.

    Imported lazily: taxonomy_diff is a stdlib-only script and parse_taxonomy
    pulls in openpyxl paths at import time in some environments, so this stays
    inside the function (interpreter rule in CLAUDE.md).
    """
    try:
        from parse_taxonomy import SCOPE_VOCABULARY
        return SCOPE_VOCABULARY
    except Exception:
        # Never let a hint be the reason the whole diff fails.
        return ["event", "item", "user"]


def _unrecognized_scope_values(taxonomy):
    """{parameter name: the scope text the parser could not read}.

    parse_taxonomy records scope_source "unrecognized" plus scope_raw when the
    author filled in the scope column with a word outside the vocabulary. Kept
    as a side lookup rather than widening _defined_parameters' (name, scope)
    tuples, whose dedup rules and tests are built around that exact shape.

    Without this, the ambiguous hint below told the author to "add a scope
    column" when they already had one and had filled it in — advice that
    cannot work, re-emitted on every comparison run.
    """
    out = {}
    if not isinstance(taxonomy, dict):
        return out
    events = taxonomy.get("events")
    commons = taxonomy.get("common_parameters")
    groups = (events if isinstance(events, list) else []) + [
        {"parameters": commons if isinstance(commons, list) else []}
    ]
    for group in groups:
        if not isinstance(group, dict):
            continue
        # Same degrade policy as _defined_parameters: a corrupt container must
        # not crash the whole comparison (pinned by the corrupt-taxonomy tests).
        params = group.get("parameters")
        if not isinstance(params, list):
            continue
        for p in params:
            if not isinstance(p, dict):
                continue
            if p.get("scope_source") == "unrecognized" and p.get("name"):
                out.setdefault(p["name"], p.get("scope_raw", ""))
    return out


def _classify_section(pairs, registry, scope_filter, unrecognized=None):
    """Classifies (name, scope) pairs and also reports registered-but-undefined ones."""
    items = []
    for name, declared in pairs:
        scope, ambiguous = param_naming.resolve_scope(name, declared, registry)
        info = param_naming.classify_parameter(name, scope, registry)
        info["ambiguous"] = ambiguous
        if ambiguous:
            raw = (unrecognized or {}).get(name)
            if raw:
                # They DID state a scope — it just wasn't readable. Telling
                # them to add a scope column here would be advice they have
                # already followed.
                hint = (
                    f"The scope column for this parameter reads {raw!r}, which this parser "
                    "does not recognize, so the scope was treated as unstated (event scope). "
                    f"Change it to one of: {', '.join(parse_scope_vocabulary())} — or prefix "
                    "the parameter name with `items.` for item scope — and re-parse."
                )
            else:
                hint = (
                    "The taxonomy does not state this parameter's scope and it is not "
                    "registered, so it was treated as event scope. If it is sent inside "
                    "the ecommerce items array, add an `items.` prefix or a scope column "
                    "to the taxonomy."
                )
            if info["classification"] != "standard_equivalent":
                # standard_equivalent parameters never need registration
                # regardless of scope, so this clause would tell the marketer
                # to both "no registration needed" (classification) and
                # "confirm scope before requesting registration" (hint) at
                # once. The scope-clarification advice above is still valid
                # either way.
                hint += " Confirm the scope before requesting registration."
            info["hint"] = hint
        items.append(info)

    # Derived from param_naming rather than restated, so a new classification
    # value cannot silently leave this counter one key short. The .get() fallback
    # covers the remaining gap: an unknown value must not become a KeyError
    # traceback on the marketer's screen — the report is worth more than the tally.
    counts = {c: 0 for c in param_naming.CLASSIFICATIONS}
    for it in items:
        c = it["classification"]
        counts[c] = counts.get(c, 0) + 1

    defined_names = {n for n, _ in pairs}
    # Same defensive read as param_naming.registry_entries: a corrupt
    # by_parameter (a string, say) reached .items() and crashed with a raw
    # AttributeError. Not a hypothetical shape — this is the third read
    # site of the same file, and the other two were hardened together.
    by_param = registry.get("by_parameter") if isinstance(registry, dict) else None
    if not isinstance(by_param, dict):
        by_param = {}
    # `parameters` covers both event- and item-scoped custom definitions: an
    # item-scoped registration missing from the taxonomy is just as much a
    # documentation gap as an event-scoped one.
    # A name registered under both event and item scope at once surfaces only
    # its event entry below (the loop breaks on the first match in this
    # ("event", "item") order). That is intentional, not an oversight: it
    # mirrors param_naming.resolve_scope's own event-wins tie-break for the
    # same dual-registration case, so a parameter's reported scope is
    # consistent whether it came from this list or from resolve_scope. Do not
    # "fix" this into reporting both entries.
    wanted = ("event", "item") if scope_filter == "event" else (scope_filter,)
    registered_not_defined = []
    for name, entries in by_param.items():
        if name in defined_names:
            continue
        if not isinstance(entries, list):
            continue
        for one in wanted:
            if any(isinstance(e, dict) and e.get("scope") == one for e in entries):
                registered_not_defined.append(
                    param_naming.describe_parameter(name, one, registry))
                break
    registered_not_defined.sort(key=lambda x: x["parameter"])
    return {
        "available": True,
        "items": items,
        "counts": counts,
        "registered_not_defined": registered_not_defined,
    }


_REGISTRY_HINT = {
    "available": False,
    "hint": ("No custom definition status found. Run this first:\n"
             f"  .ga4/venv/bin/python {sibling_script('ga-taxonomy', 'custom_dims.py')} fetch"),
}


def build_report():
    tp = taxonomy_json_path()
    cp = collected_events_path()
    if not tp.exists():
        return {
            "ok": False,
            "error": "The taxonomy (taxonomy.json) doesn't exist.",
            "hint": "Create the taxonomy first with parse_taxonomy.py.",
        }
    if not cp.exists():
        return {
            "ok": False,
            "error": "The collected-events cache (collected_events.json) doesn't exist.",
            "hint": "Fetch real collected data first with ga4_events.py list.",
        }
    try:
        taxonomy = json.loads(tp.read_text(encoding="utf-8"))
        collected = json.loads(cp.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return {
            "ok": False,
            "error": f"A cache file is corrupted: {e}",
            "hint": "Regenerate the file with parse_taxonomy.py or ga4_events.py list.",
        }
    if not isinstance(taxonomy, dict) or not isinstance(collected, dict):
        return {
            "ok": False,
            "error": "A cache file's structure is invalid (top level isn't an object).",
            "hint": "Regenerate the file with parse_taxonomy.py or ga4_events.py list.",
        }
    d = diff_events(_event_names(taxonomy), _event_names(collected))

    registry = None
    rp = custom_definitions_path()
    if rp.exists():
        try:
            loaded = json.loads(rp.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                registry = loaded
        except json.JSONDecodeError:
            registry = None  # degrade a corrupted registry to "not available"

    if registry is None:
        # If both sections shared the same dict, mutating one would leak into
        # the other. Give each its own copy.
        parameters = dict(_REGISTRY_HINT)
        user_properties = dict(_REGISTRY_HINT)
    else:
        try:
            parameters = _classify_section(
                _defined_parameters(taxonomy), registry, "event",
                _unrecognized_scope_values(taxonomy))
            user_properties = _classify_section(
                _defined_user_properties(taxonomy), registry, "user")
        except ValueError as e:
            return {
                "ok": False,
                "error": f"The taxonomy has an invalid scope value: {e}",
                "hint": "Regenerate taxonomy.json with parse_taxonomy.py.",
            }

    days = collected.get("days")
    report = {"ok": True, "days": days}
    # Placed above the buckets rather than appended after them: it decides how
    # every bucket below should be read, and a reader who meets it last has
    # already drawn the wrong conclusion.
    invalid = _invalid_ga4_names(taxonomy)
    if invalid:
        report["invalid_names"] = invalid
    report.update({
        "defined_not_seen_recently": d["defined_not_seen_recently"],
        "collected_but_undefined": d["collected_but_undefined"],
        "auto_collected_undocumented": d["auto_collected_undocumented"],
        "defined_and_collected": d["defined_and_collected"],
        "counts": {
            "defined_and_collected": len(d["defined_and_collected"]),
            "defined_not_seen_recently": len(d["defined_not_seen_recently"]),
            "collected_but_undefined": len(d["collected_but_undefined"]),
            "auto_collected_undocumented": len(d["auto_collected_undocumented"]),
        },
        "parameters": parameters,
        "user_properties": user_properties,
    })
    if "near_misses" in d:
        report["near_misses"] = d["near_misses"]
    report.update(_cache_freshness(collected))
    if d["defined_not_seen_recently"]:
        window = f"the last {days} days" if days else "this query window"
        report["note"] = (
            f"defined_not_seen_recently means 'wasn't seen during {window}', "
            "not 'isn't implemented'. Low-frequency events get caught by this as-is, "
            "so before concluding an implementation is missing, check over a longer "
            "period (ga4_events.py list --days 365)."
        )
    return report


def main(argv=None):
    report = build_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report.get("ok"):
        sys.exit(1)


if __name__ == "__main__":
    main()
