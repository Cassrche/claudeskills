"""Shared builder for GA4 report requests. (some functions require venv)

Filter expressions, ordering, and numeric conversion are shared by runReport /
runRealtimeReport / runPivotReport (and any future report with the same filter
syntax). Response shaping is shared too, since the rows structure is identical:
shape_report_response is shared by all three reports, and Pivot's
shape_pivot_response reuses it, appending only aggregates on top. CLI execution
(run_cli) is shared by **all five scripts** (query, realtime, pivot, cohort,
funnel), so the request provenance appended here applies to all five reports.
google types are lazily imported inside functions (response shaping is pure Python).
"""

# ---- spec key validation --------------------------------------------------
#
# The five scripts share filter/order syntax, but **which top-level keys each one
# reads differs** (pivot doesn't read top-level order_bys/limit, realtime doesn't
# read date_ranges). Silently dropping an unknown key would produce plausible-looking
# numbers with the user's requested period or filter silently missing, and since the
# provenance run_cli attaches **echoes the user's spec verbatim**, a wrong result would
# look confirmed rather than wrong. So we block this before the call.
#
# In particular, the official GA4 REST docs use camelCase (dateRanges, dimensionFilter,
# orderBys), but these scripts only read snake_case. That's the most common mistake,
# so we call it out separately.
import math
import re as _re

_CAMEL_BOUNDARY = _re.compile(r"(?<!^)(?=[A-Z])")


def to_snake(key):
    return _CAMEL_BOUNDARY.sub("_", key).lower()


def check_spec_keys(spec, known, unsupported=None, script=None):
    """Check whether the spec's top-level keys are ones this script actually reads.

    known: the set of keys actually read. unsupported: {key: reason} — keys to
    explain as unsupported.
    """
    if not isinstance(spec, dict):
        raise ValueError(f"spec must be an object: {spec!r}")
    unknown = [k for k in spec if k not in known]
    if not unknown:
        return

    details = []
    for k in unknown:
        snake = to_snake(k)
        if snake != k and snake in known:
            details.append(f"{k} (use {snake} instead — this script only reads snake_case)")
        elif unsupported and k in unsupported:
            details.append(f"{k} ({unsupported[k]})")
        elif unsupported and snake != k and snake in unsupported:
            # An "unsupported" key written in camelCase. If it were snake_case it would
            # get an explanation; if the explanation disappears just because the name
            # differs, the guidance aimed at exactly this camelCase mistake never surfaces.
            details.append(f"{k} ({unsupported[snake]})")
        else:
            details.append(repr(k))
    where = f"{script} does not " if script else ""
    raise ValueError(
        f"{where}support these keys: {'; '.join(details)}. "
        f"Supported keys: {', '.join(sorted(known))}. "
        "If it's a typo, fix it; if it's an unsupported feature, remove it from the spec and retry."
    )


NUM_OP = {
    ">": "GREATER_THAN",
    ">=": "GREATER_THAN_OR_EQUAL",
    "<": "LESS_THAN",
    "<=": "LESS_THAN_OR_EQUAL",
    "=": "EQUAL",
}


# Keys each filter leaf actually reads. Anything else is a typo or a
# camelCase spelling, and silently ignoring it changes the result rather than
# merely losing a detail — see the comment in _dimension_leaf.
DIMENSION_LEAF_KEYS = {"field", "value", "in_list", "match_type", "case_sensitive"}
METRIC_LEAF_KEYS = {"metric", "op", "value", "from", "to"}


# ---- filter builders -------------------------------------------------------

def filter_value(v, where):
    """Reject null where a filter comparison value is expected.

    On the string side `str(None)` is the literal text "None", so a null value
    silently became a filter for rows whose value is the word "None" — which
    matches nothing, returning a confident zero. Worse, the empty-response note
    in shape_report_response then reassures the reader that zero is the real
    answer rather than a broken request. On the numeric side it leaked a raw
    `TypeError: float() argument must be a string or a real number`.
    """
    if v is None:
        raise ValueError(
            f"{where} cannot be null. A null comparison value silently becomes the literal "
            'text "None" (matching nothing) instead of erroring. Provide an actual value, '
            "or drop the filter entirely if you did not mean to filter."
        )
    return v


def as_number(v, where):
    """Read a numeric filter value, rejecting quoted numbers, booleans, and objects.

    float("100") is 100.0 and float(True) is 1.0, so a quoted number or a boolean
    used to slip through silently converted — the same trap as_int closes for
    integer fields (proto coerces "10" to 10). A genuinely non-numeric string then
    leaked a raw "could not convert string to float: 'banana'" with no field name.
    JSON has real numbers, so a non-number here is always a mistake worth naming.
    bool is a subtype of int, so it is excluded explicitly rather than read as 1/0.
    NaN and Infinity pass isinstance(float) — Python's json module parses those
    literals by default — but GA4 has no such comparison value, so a non-finite
    number is rejected here instead of dying later as an opaque API 400.
    Returns the original number so callers can still compare it (e.g. a between
    range check) before it becomes a NumericValue.
    """
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
        raise ValueError(
            f"{where} must be a finite number (a plain JSON number): {v!r}. "
            'Write it without quotes — e.g. 100, not "100" — and not NaN or Infinity.'
        )
    return v


def numeric_value(v):
    from google.analytics.data_v1beta.types import NumericValue

    # Callers run as_number first, so v is a real int/float (bool already
    # excluded there). int64 for whole numbers, double otherwise.
    if isinstance(v, int):
        return NumericValue(int64_value=v)
    return NumericValue(double_value=v)


def numeric_filter_value(v, where):
    """A metric-filter comparison value: reject null (filter_value) and anything
    non-numeric (as_number) in one call, returning the validated number so every
    numeric leaf checks the same way."""
    return as_number(filter_value(v, where), where)


def require_in_list_values(values):
    """Validate an in_list filter node: a list whose entries are all scalar.

    Shared by every filter leaf (runReport dimension filters, funnel step
    filters): the filter syntax is common to the five report scripts, so the
    rule lives here instead of per-leaf.

    A string would silently be split character-by-character into a bogus
    filter, so reject it explicitly. Each entry is stringified by the caller —
    a number like 123 legitimately becomes "123" since dimension values are
    text — but a nested list/tuple/dict is a mistake str() would render as
    "{'x': 1}" / "('b', 'c')", a value that matches nothing (measured live).
    Reject it rather than build a silently-empty filter. Tuples are
    unreachable from JSON stdin, but other paths treat them as live input, so
    reject them here too for consistency. bool is deliberately left scalar
    (str(True)="True"): dimension values are free text, so this is lenient by
    choice, not an oversight.
    """
    if not isinstance(values, (list, tuple)):
        raise ValueError(f"in_list must be a list of values: {values!r}")
    bad = [v for v in values if isinstance(v, (list, tuple, dict))]
    if bad:
        raise ValueError(
            f"in_list entries must be scalar values (strings or numbers): {bad!r}"
        )
    return values


def require_single_filter_value(value, where):
    """Reject a container where a single filter value was meant.

    A list/dict here is almost always an in_list mistaken for a single value:
    str() would turn it into "['purchase', 'refund']" and silently match
    nothing — measured live, a confident 0-row answer that reads as "no
    events matched". Point at in_list instead of returning that wrong zero.
    Shared by the runReport and funnel filter leaves (same syntax, one rule).
    """
    if isinstance(value, (list, tuple, dict)):
        raise ValueError(
            f"{where} must be a single value, not {value!r}. "
            'To match several values at once, use in_list: '
            '{"field": ..., "in_list": [...]}.'
        )
    return value


def _dimension_leaf(node):
    from google.analytics.data_v1beta.types import Filter, FilterExpression

    # camelCase here silently changes WHICH ROWS MATCH rather than erroring:
    # "matchType" leaves match_type at its EXACT default, so a CONTAINS filter
    # quietly becomes an exact-match one and returns a different (usually much
    # smaller) set. The official GA4 REST docs use camelCase, and the guide
    # warns that only snake_case is read — but that protection lived only in
    # the top-level check_spec_keys, never in the filter leaves.
    check_spec_keys(node, DIMENSION_LEAF_KEYS, script="dimension filter condition")
    field = require_name_string(
        node["field"],
        "dimension filter's field",
        '{"field": "eventName", "value": "purchase"} — "field" is a plain '
        "name string, not an object.",
    )
    case_sensitive = as_bool(node.get("case_sensitive"), "case_sensitive")
    if "in_list" in node:
        values = require_in_list_values(node["in_list"])
        return FilterExpression(filter=Filter(
            field_name=field,
            in_list_filter=Filter.InListFilter(
                values=[str(filter_value(v, "in_list entry")) for v in values],
                case_sensitive=case_sensitive,
            ),
        ))
    if "value" not in node:
        raise ValueError(f"dimension filter requires value: {node!r}")
    value = filter_value(node["value"], "dimension filter value")
    require_single_filter_value(value, "dimension filter value")
    match = node.get("match_type", "EXACT")
    try:
        match_type = Filter.StringFilter.MatchType[match]
    except KeyError:
        raise ValueError(
            f"Unknown match_type: {match!r}. "
            "Must be one of EXACT, CONTAINS, BEGINS_WITH, ENDS_WITH, FULL_REGEXP, PARTIAL_REGEXP."
        )
    return FilterExpression(filter=Filter(
        field_name=field,
        string_filter=Filter.StringFilter(
            match_type=match_type,
            value=str(value),
            case_sensitive=case_sensitive,
        ),
    ))


def _metric_leaf(node):
    from google.analytics.data_v1beta.types import Filter, FilterExpression

    check_spec_keys(node, METRIC_LEAF_KEYS, script="metric filter condition")
    metric = require_name_string(
        node["metric"],
        "metric filter's metric",
        '{"metric": "eventCount", "op": ">", "value": 10} — "metric" is a '
        "plain name string, not an object.",
    )
    op = node.get("op")
    if op == "between":
        if "from" not in node or "to" not in node:
            raise ValueError(f"between filter requires both from and to: {node!r}")
        from_v = numeric_filter_value(node["from"], "between's from")
        to_v = numeric_filter_value(node["to"], "between's to")
        # An inverted range (from > to) matches nothing, and GA4 answers it with
        # zero rows and no error (measured live) — the same silent-empty trap as
        # an inverted cohort window. Name it instead of returning a confident 0.
        # from == to is a valid single-value match.
        if from_v > to_v:
            raise ValueError(
                f"between's from must be <= to (got from={from_v}, to={to_v}): an "
                "inverted range matches nothing, and GA4 returns zero rows with no "
                "error — which reads as 'no events'. Swap the two values."
            )
        return FilterExpression(filter=Filter(
            field_name=metric,
            between_filter=Filter.BetweenFilter(
                from_value=numeric_value(from_v),
                to_value=numeric_value(to_v),
            ),
        ))
    if "value" not in node:
        raise ValueError(f"metric filter requires value: {node!r}")
    if op == "!=":
        eq = FilterExpression(filter=Filter(
            field_name=metric,
            numeric_filter=Filter.NumericFilter(
                operation=Filter.NumericFilter.Operation["EQUAL"],
                value=numeric_value(numeric_filter_value(node["value"], "metric filter value")),
            ),
        ))
        return FilterExpression(not_expression=eq)
    if op not in NUM_OP:
        raise ValueError(f"Unknown metric op: {op!r}")
    return FilterExpression(filter=Filter(
        field_name=metric,
        numeric_filter=Filter.NumericFilter(
            operation=Filter.NumericFilter.Operation[NUM_OP[op]],
            value=numeric_value(numeric_filter_value(node["value"], "metric filter value")),
        ),
    ))


def _filter_group(node, key, kind):
    """Validate and return the child list of an and/or node.

    If it weren't a list, this used to leak a raw Python error
    ("string indices must be integers") with no clue what was wrong. and/or
    must be **an array of multiple conditions**.
    """
    children = node[key]
    if not isinstance(children, list):
        raise ValueError(
            f"Filter's {key!r} must be an array of conditions: {children!r}. "
            f'If there is only one condition, wrap it in an array — {{"{key}": [{{...}}]}}'
        )
    return [build_filter_expression(n, kind) for n in children]


COMBINATOR_KEYS = ("and", "or", "not")


def reject_stray_leaf_keys(node, leaf_keys, where, fix_hint=None,
                           combinator_is_dropped=False):
    """Reject a node that mixes and/or/not with a key that would be dropped.

    Only one of the two can take effect, and the other vanishes with no error —
    silently discarding half of what was asked for, so the request reads as
    "filter applied" when only part of it was, producing a plausible-looking
    wrong number.

    This has surfaced in four separate positions (two filter builders, funnel
    step level, and cross-kind leaf keys), so it lives here as one shared check
    rather than being re-enumerated per call site — a new builder should call
    this instead of hand-rolling the guard and risking a fifth gap.

    leaf_keys: every key that would be ignored, NOT just the one matching this
    node's kind — a cross-wired key (a "field" inside a metric_filter) is
    dropped exactly as silently as a matching one.

    combinator_is_dropped: which side actually loses. The two call sites are
    opposites, and saying the wrong one would send the reader after the wrong
    key. In the filter builders, and/or/not is checked first and wins, so the
    leaf key is dropped (the default). At the funnel step level it inverts:
    the mode key (event_name/field/filter_expression) is what _step reads, and
    the step's own and/or/not is what nothing ever reads.
    """
    if not isinstance(node, dict):
        return
    combinators = [k for k in COMBINATOR_KEYS if k in node]
    if not combinators:
        return
    stray = [k for k in leaf_keys if k in node]
    if not stray:
        return
    dropped, kept = (combinators, stray) if combinator_is_dropped else (stray, combinators)
    # "not" takes a single object, and/or take a list — emitting the list form
    # for "not" hands the reader a spec that fails when they follow it (caught
    # in review).
    first = combinators[0]
    if fix_hint:
        fix = fix_hint
    elif first == "not":
        fix = (
            f'Move it inside {first!r} instead: {{"not": {{"{stray[0]}": ...}}}} '
            "(not takes a single condition, not a list)."
        )
    else:
        fix = (
            f"Move it inside the {first!r} list instead: "
            f'{{"{first}": [{{"{stray[0]}": ...}}, ...]}}'
        )
    raise ValueError(
        f"{where} mixes {combinators} with {stray}, but {dropped} is silently ignored "
        f"— only {kept} takes effect. {fix}"
    )


def build_filter_expression(node, kind):
    """Recursively convert a dict node into a FilterExpression. kind: 'dimension'|'metric'."""
    from google.analytics.data_v1beta.types import FilterExpression, FilterExpressionList

    # If this isn't an object, the `in` checks below either fall through to
    # substring matching on a string or blow up on a bool
    # (observed: {"not": true} -> "argument of type 'bool' is not iterable").
    if not isinstance(node, dict):
        raise ValueError(
            f"Filter condition must be an object: {node!r}. "
            'Example: {"field": "eventName", "value": "purchase"} '
            'or {"metric": "eventCount", "op": ">", "value": 10}'
        )
    # Both leaf keys, not just this kind's: a cross-wired key (a "field" in a
    # metric_filter) next to a combinator is dropped just as silently, and the
    # cross-wiring mistake is one people demonstrably make — see the
    # kind-mismatch branches at the end of this function.
    reject_stray_leaf_keys(node, ("field", "metric"), "Filter condition")
    if "and" in node:
        return FilterExpression(and_group=FilterExpressionList(
            expressions=_filter_group(node, "and", kind)))
    if "or" in node:
        return FilterExpression(or_group=FilterExpressionList(
            expressions=_filter_group(node, "or", kind)))
    if "not" in node:
        return FilterExpression(not_expression=build_filter_expression(node["not"], kind))
    if kind == "dimension" and "field" in node:
        return _dimension_leaf(node)
    if kind == "metric" and "metric" in node:
        return _metric_leaf(node)
    # The two shapes are easy to cross-wire (dimension_filter uses "field",
    # metric_filter uses "metric"+"op"), and this is the one place that
    # mistake reaches — it used to fall through to a bare repr with no fix.
    # Name the mismatch instead of leaving Claude to reverse-engineer it from
    # what it already wrote (see "friendly error messages" tests below).
    if kind == "metric" and "field" in node:
        raise ValueError(
            f"Unknown filter shape: {node!r}. This is a metric_filter, so use "
            '{"metric": "...", "op": ">", "value": ...} — "field" belongs to '
            "dimension_filter, not metric_filter."
        )
    if kind == "dimension" and "metric" in node:
        raise ValueError(
            f"Unknown filter shape: {node!r}. This is a dimension_filter, so "
            'use {"field": "...", "value": "..."} — "metric"/"op" belong to '
            "metric_filter, not dimension_filter."
        )
    raise ValueError(
        f"Unknown filter shape: {node!r}. "
        'Example: {"field": "eventName", "value": "purchase"} '
        'or {"metric": "eventCount", "op": ">", "value": 10}'
    )


# ---- ordering ---------------------------------------------------------------

def require_string_list(value, where, allow_objects=False):
    """Reject a bare string where a list of names is expected.

    A Python string is iterable, so `[Dimension(name=d) for d in "eventName"]`
    silently builds NINE dimensions named 'e','v','e','n','t','N','a','m','e'
    instead of failing. GA4 then answers about a field the caller never wrote —
    observed: `metrics: "eventCount"` came back as
    "400 Did you mean date? Field e is not a valid dimension", which is close
    to undebuggable from the message alone.
    """
    if value is None:
        return []
    if isinstance(value, str):
        raise ValueError(
            f"{where} must be an array of names, not a single string: {value!r}. "
            f'Wrap it in an array — ["{value}"]. (A bare string is read '
            "character-by-character, which silently produces one entry per letter.)"
        )
    if not isinstance(value, (list, tuple)):
        raise ValueError(f"{where} must be an array of names: {value!r}")
    items = list(value)
    if allow_objects:
        # ga4_query's metrics also accepts {"name", "expression"} objects, and
        # its own _metric() gives a clear message for anything else.
        return items
    # Everywhere else only names are valid, and a non-string element used to
    # reach the protobuf constructor and leak a raw
    # "AttributeError: 'ProtoType' object has no attribute 'DESCRIPTOR'" —
    # meaningless to a marketer, and a hintless error besides.
    bad = [v for v in items if not isinstance(v, str)]
    if bad:
        raise ValueError(
            f"{where} must contain only names (strings): {bad!r}. "
            'Write them as plain strings — ["eventCount", "totalUsers"].'
        )
    return items


def require_name_string(value, where, example):
    """Reject a non-string field/metric name before it reaches a proto constructor.

    The raw GA4 API nests these (`{"field_name": "eventName"}`,
    `{"dimension_name": "date"}`), and anyone translating from the REST docs
    writes the shorthand with the nested shape — which leaks as
    "AttributeError: 'ProtoType' object has no attribute 'DESCRIPTOR'" from
    deep inside proto-plus, meaningless to a marketer and hintless besides.
    Observed live: an order_bys entry written as
    {"dimension": {"dimension_name": "date"}} crashed the query with exactly
    that message.
    """
    if not isinstance(value, str):
        raise ValueError(
            f"{where} must be a name (string): {value!r}. "
            f"Write it as a plain name — {example}"
        )
    return value


def as_bool(value, where, default=False):
    """Read a boolean option, rejecting the truthy-string trap.

    `bool("false")` is True in Python, so a quoted "false" flips the option to
    its opposite with no error. That INVERTS results rather than degrading
    them: order_bys' `desc: "false"` sorts descending (confirmed live: returned
    the top sellers when the caller asked for the bottom), and funnel's
    `is_open_funnel: "false"` silently opens the funnel. JSON has real
    booleans, so a string here is always a mistake worth naming.
    """
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    raise ValueError(
        f"{where} must be true or false (a JSON boolean), not {value!r}. "
        'Note that the string "false" is not the boolean false — it reads as '
        "true and would silently give you the opposite of what you asked for."
    )


def as_int(value, where):
    """Read an integer option, rejecting quoted numbers and objects.

    Proto-plus silently coerces a numeric string ("3" -> 3), so a quoted
    "limit": "10" slips through unseen — but "banana" leaks as a raw
    "invalid literal for int() with base 10" and a dict as "'dict' object
    cannot be interpreted as an integer", neither naming the field that
    carries the bad value (observed live in ga-use testing, Jul 2026: a
    cohort's offsets.start: "0" died with exactly that str message). JSON
    has real numbers, so a non-int here is always a mistake worth naming.
    """
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(
            f"{where} must be an integer (a plain JSON number): {value!r}. "
            'Write it without quotes — e.g. 10, not "10".'
        )
    return value


def check_positive_int(value, where):
    """Reject limit=0 (GA4 treats it as 'return all rows', which confuses a
    marketer expecting a bounded top-N and is rarely what was actually asked
    for). Was previously copy-pasted into ga4_query.py/ga4_realtime.py/
    ga4_funnel.py/ga4_pivot.py — that duplication is exactly the failure mode
    it caused: a 5th call site (ga4_cohort.py's own limit) had no local copy
    and so silently never got this check at all (caught in review, Jul 2026).
    Centralized here alongside as_int/require_name_string so every future
    limit field goes through one place.
    """
    if value <= 0:
        raise ValueError(
            f"{where} must be positive: {value!r}. GA4 treats 0 as 'return all rows', "
            "which is rarely what you want — use a large number like 10000 instead."
        )
    return value


def as_positive_int(value, where):
    """A limit field: integer (as_int) and > 0 (check_positive_int) in one call.

    The composition was repeated at every limit site with the field label
    stated twice; bundling it makes the label one edit and guarantees a new
    limit field gets both halves of the check.
    """
    return check_positive_int(as_int(value, where), where)


DATE_RANGE_KEYS = {"start_date", "end_date", "name"}


def build_date_ranges(ranges, alpha=False):
    """Build DateRange entries, validating each one's shape first.

    All three period-taking scripts (query, pivot, funnel) built these inline
    and identically, so a missing/typo'd key surfaced as a raw
    `KeyError: 'end_date'` — which reaches the marketer as
    `{"error": "'end_date'"}`, a quoted key name explaining nothing, plus the
    generic "check your auth" hint that actively points the wrong way. An
    unknown key was ignored outright.

    alpha: runFunnelReport is v1alpha and its DateRange is a DISTINCT type from
    v1beta's — passing the wrong one fails with "expected <class 'DateRange'>
    got <class '...v1beta...DateRange'>", so the caller must say which API it
    is building for. (Caught by the funnel tests when this was first shared.)
    """
    if alpha:
        from google.analytics.data_v1alpha.types import DateRange
    else:
        from google.analytics.data_v1beta.types import DateRange

    if not isinstance(ranges, list):
        raise ValueError(
            f"date_ranges must be an array: {ranges!r}. "
            'Wrap it in an array even for a single period — '
            '[{"start_date": "28daysAgo", "end_date": "yesterday"}]'
        )
    out = []
    for r in ranges:
        if not isinstance(r, dict):
            raise ValueError(
                f"date_ranges item must be an object: {r!r}. "
                'Example: {"start_date": "28daysAgo", "end_date": "yesterday"}'
            )
        check_spec_keys(r, DATE_RANGE_KEYS, script="date_ranges item")
        missing = [k for k in ("start_date", "end_date") if k not in r]
        if missing:
            raise ValueError(
                f"date_ranges item is missing {', '.join(missing)}: {r!r}. "
                'Both are required — {"start_date": "28daysAgo", "end_date": "yesterday"}'
            )
        kw = {"start_date": r["start_date"], "end_date": r["end_date"]}
        if r.get("name"):
            kw["name"] = r["name"]
        out.append(DateRange(**kw))
    return out


ORDER_BY_KEYS = {"metric", "dimension", "desc"}

# GA4's DimensionOrderBy defaults to ALPHANUMERIC (lexical) sorting. Most GA4
# string-valued numeric dimensions are zero-padded and so sort correctly either
# way (date "20260826", yearMonth "202608", day "06", month "08", week "05",
# year "2026", the cohort nthDay/nthWeek/nthMonth family "0001" — all verified
# live) — dayOfWeek needs no padding since every value is one digit (0-6). Two
# are NOT zero-padded and sort wrong under the default: `hour` ("0".."23") and
# `minute` ("0".."59"). Measured live: sorting a 90-day screenPageViews-by-hour
# query by `hour` came back 0, 1, 10, 11, ..., 19, 2, 20, 21, 22, 23, 3, 4, ...,
# 9 — a "peak hour" chart or "busiest hour" read from that order would be
# silently wrong. GA4's API supports an explicit NUMERIC order type per
# dimension order-by (confirmed live: it produces the expected 0..23 order) —
# applied automatically for these two rather than requiring the caller to know
# about the trap.
_NUMERIC_STRING_DIMENSIONS = frozenset({"hour", "minute"})


def build_order_bys(specs):
    if not specs:
        return None
    from google.analytics.data_v1beta.types import OrderBy

    # The list validation that pivots/steps/cohorts have was missing here, so a
    # malformed shape leaked as "'str' object has no attribute 'get'".
    if not isinstance(specs, list):
        raise ValueError(
            f"order_bys must be an array: {specs!r}. "
            'Wrap it in an array even with a single sort key — [{"metric": "eventCount", "desc": true}]'
        )
    out = []
    for o in specs:
        if not isinstance(o, dict):
            raise ValueError(
                f"order_bys item must be an object: {o!r}. "
                'Example: {"metric": "eventCount", "desc": true}'
            )
        # An unknown key here silently INVERTS the ranking rather than merely
        # dropping a detail: "desc" defaults to False, so {"metric": "...",
        # "descending": true} (the camelCase spelling the official GA4 REST
        # docs use) sorts ASCENDING with no error. Confirmed live: a "top 3
        # items by revenue" query returned the three WORST sellers (37.8 vs
        # the real top of 2269) and read as a perfectly normal result. The
        # top-level spec has had check_spec_keys guarding exactly this class
        # of mistake for a while; nested objects like this one never got it.
        check_spec_keys(o, ORDER_BY_KEYS, script="order_bys item")
        desc = as_bool(o.get("desc"), "order_bys item's desc")
        # Both keys present is ambiguous, and the if/elif below would silently
        # take "metric" and drop "dimension" — the same quiet ranking change the
        # check_spec_keys note above warns about, just via a second key instead of
        # a misspelled one. Funnel steps guard "exactly one of" the same way; a
        # tiebreak sort is two separate order_bys entries, not both keys in one.
        if "metric" in o and "dimension" in o:
            raise ValueError(
                f"order_bys item takes exactly one of metric or dimension, not both: "
                f"{o!r}. To sort by a metric with a dimension tiebreak, use two "
                'entries: [{"metric": ...}, {"dimension": ...}].'
            )
        if "metric" in o:
            name = require_name_string(
                o["metric"],
                "order_bys item's metric",
                '{"metric": "eventCount", "desc": true} — "metric" is a plain '
                "name string, not an object.",
            )
            out.append(OrderBy(metric=OrderBy.MetricOrderBy(metric_name=name), desc=desc))
        elif "dimension" in o:
            name = require_name_string(
                o["dimension"],
                "order_bys item's dimension",
                '{"dimension": "date", "desc": true} — "dimension" is a plain '
                "name string, not an object.",
            )
            dim_order_by = OrderBy.DimensionOrderBy(dimension_name=name)
            if name in _NUMERIC_STRING_DIMENSIONS:
                dim_order_by.order_type = OrderBy.DimensionOrderBy.OrderType.NUMERIC
            out.append(OrderBy(dimension=dim_order_by, desc=desc))
        else:
            raise ValueError(f"order_bys item requires a metric or dimension key: {o!r}")
    return out


# ---- response shaping -------------------------------------------------------

def _shape_rows(rows, dim_headers, met_headers):
    """Read a row list by header index and convert it to a list of dicts. (pure Python)"""
    out = []
    for r in rows:
        row = {}
        for i, h in enumerate(dim_headers):
            row[h] = r.dimension_values[i].value
        for i, h in enumerate(met_headers):
            row[h] = r.metric_values[i].value
        out.append(row)
    return out


# ---- non-additive metrics ---------------------------------------------------
#
# User and session counts are **deduplicated** values, so summing rows split by
# dimension inflates them beyond the true total: a user spanning multiple
# days/countries is counted once per row. Measured on a live property over one
# month: summing daily activeUsers came out 13% above the true monthly total.
# Count metrics like eventCount, by contrast, matched it exactly.
#
# "How many users this month?" is the single most common question a marketer asks,
# so this mistake fails silently with a plausible-looking number. If a true total is
# needed, query again separately with no dimensions.
NON_ADDITIVE_METRICS = {
    "sessions", "engagedSessions", "dauPerMau", "dauPerWau", "wauPerMau",
    # totalPurchasers is a deduplicated unique-purchaser count, same category
    # as activeUsers/totalUsers, but the name doesn't end in "Users" so the
    # suffix check below never caught it. Confirmed live on a production
    # property (30-day window): summed across a date split, 176 vs a true total of 169
    # (+4%); across deviceCategory, 171 vs 169 — a purchaser active on
    # multiple days/devices counted once per row, same failure mode as the
    # activeUsers example above. firstTimePurchasers was checked too and is
    # NOT included here: summed across the same date split it matched the
    # true total exactly (138 == 138) — a first purchase happens in exactly
    # one row, so it's genuinely safe to sum. Don't add it without re-checking.
    "totalPurchasers",
}
# Ones detected by name (this also catches custom metrics and cohort metrics):
# - Any metric ending in "Users" is a deduplicated user count in GA4
#   (activeUsers, totalUsers, newUsers, active7DayUsers, cohortActiveUsers, ...).
# - Rates and averages are meaningless to sum in the first place.
#
# Hints are matched **case-sensitively**. Matching lowercase too would catch
# letters that happen to appear inside a custom metric name — e.g. "generate_lead"
# contains "rate" inside "generate". GA4 metric names are camelCase, so an inner
# word always starts uppercase, which is enough here; only the leading word is
# lowercase (averageSessionDuration), so prefixes are checked separately.
NON_ADDITIVE_NAME_HINTS = ("Rate", "Percent", "Average")
NON_ADDITIVE_PREFIXES = ("average", "percent")

# "PerUser"/"PerSession" used to be literal hints, which meant the rule only
# knew the two denominators someone had thought of. Every "per <something>"
# metric is a ratio, and summing a ratio across rows is meaningless whatever
# the denominator is, so match the shape instead.
#
# Found by measuring all 86 metrics a live property exposes, summed across a
# date split versus the true total. Two ratio metrics slipped through the
# literal hints, and both are ecommerce ones:
#   transactionsPerPurchaser        true 1.07  vs  daily sum 29.31
#   firstTimePurchasersPerNewUser   true 0.005 vs  daily sum 0.157
# "PerPurchaser" and "PerNewUser" simply were not in the list, and neither name
# ends in "Users" either — firstTimePurchasersPerNewUser ends in "User".
#
# Per[A-Z] rather than "Per": in camelCase an inner word always starts
# uppercase, so this matches "per <noun>" without matching a custom metric that
# merely contains the letters (e.g. a parameter named "temperature").
_PER_RATIO = _re.compile(r"Per[A-Z]")


def _is_non_additive(name):
    return (
        name in NON_ADDITIVE_METRICS
        or name.endswith("Users")
        or name.startswith(NON_ADDITIVE_PREFIXES)
        or any(hint in name for hint in NON_ADDITIVE_NAME_HINTS)
        or bool(_PER_RATIO.search(name))
    )


def non_additive_metrics(metric_headers):
    """Pick out metric names whose rows must not be summed."""
    return [name for name in metric_headers if _is_non_additive(name)]


def _non_additive_kind(name):
    """Which of two unrelated reasons a metric can't be summed across rows.

    _is_non_additive lumps both into one bucket, and the note used to describe
    every one of them as "deduplicated values" — true for a distinct-count
    metric like activeUsers or sessions (a user active on several rows gets
    counted once per row), but wrong for engagementRate or
    averageSessionDuration: those aren't deduplicated at all, they're rates
    and averages, and summing (or averaging) them across a split is invalid
    arithmetic regardless of deduplication. Ratio hints are checked first —
    NON_ADDITIVE_METRICS lists dauPerMau/dauPerWau/wauPerMau alongside true
    dedup counts for historical reasons, but they are ratios (Per[A-Z]
    catches them), not deduplicated counts, so they must not fall through
    to "dedup" by membership alone.
    """
    if (name.startswith(NON_ADDITIVE_PREFIXES)
            or any(hint in name for hint in NON_ADDITIVE_NAME_HINTS)
            or _PER_RATIO.search(name)):
        return "ratio"
    return "dedup"


def prepend_note(out, text, rewrite=None):
    """Puts text at the front of out["note"], keeping anything already there.

    Every producer of "note" goes through this. They used to each assign the key
    directly, which is how one of them silently overwrote another; the ordering
    rule (most answer-changing message first) only works if adding is uniform.
    Mutates out, like the other _add_* helpers on this path.

    Messages are joined with a newline rather than run together in prose. With
    several producers, up to four fire at once in practice — a live query hitting
    an untracked metric, an unset dimension and a non-additive metric produced
    one 900-character paragraph chained by "Also: ... Also: ...". Nobody reads
    that raw (SKILL.md forbids showing script output to the marketer), but the
    consumer is a model summarising it, and a point buried mid-paragraph is much
    easier to drop than one standing on its own line. Separate lines also make
    the ordering visible instead of implied.

    `rewrite`, if given, transforms the existing note before it is kept — for
    the rare case where the new note doesn't just add information but changes
    what an earlier note claims (see add_funnel_retention_note, which softens
    a flat "usually means zero users" once retention explains the emptiness
    instead). Writing out["note"] is only allowed inside this function (a test
    checks that mechanically), so a producer that needs to touch existing text
    must come through here rather than editing the dict itself.
    """
    existing = out.get("note")
    if rewrite and existing:
        existing = rewrite(existing)
    out["note"] = f"{text}\n{existing}" if existing else text
    return out


# ---- what GA4 says about the response itself --------------------------------
#
# RunReportResponse.metadata carries seven signals and this skill read none of
# them. Two of them decide whether the numbers can be quoted at all:
#
#   sampling_metadatas       the report is an ESTIMATE from a sample, not a count
#   subject_to_thresholding  rows were withheld for privacy, so totals are short
#
# and data_loss_from_other_row means high-cardinality values were collapsed into
# an "(other)" bucket, so a "top N" is missing an unknown amount of tail.
#
# currency_code matters more than it looks. The property measured here runs on
# Asia/Seoul time and reports revenue in USD — a Korean marketer reading a dollar
# figure as won is off by roughly 1300x, and nothing in the response says
# otherwise. So the currency travels with the numbers, always.
#
# Realtime responses have no metadata field at all (checked against the type),
# hence the getattr guard rather than a try/except.
METADATA_ALERTS = (
    ("sampling", "These numbers are estimates from a sampled subset, not exact "
                 "counts. Say so when reporting them, and do not present small "
                 "differences between them as real."),
    ("subject_to_thresholding",
     "GA4 withheld some rows to protect user privacy, so the totals here are "
     "short by an unknown amount. Treat them as a lower bound."),
    ("data_loss_from_other_row",
     "Some dimension values were collapsed into a single \"(other)\" row because "
     "the dimension has too many distinct values. The breakdown is incomplete and "
     "its long tail is unrecoverable at this cardinality — narrow the query "
     "(filter, or a shorter period) if the tail matters."),
)


def _add_response_metadata(out, resp):
    meta = getattr(resp, "metadata", None)
    if meta is None:
        return out
    info = {}
    for field in ("currency_code", "time_zone", "empty_reason"):
        value = getattr(meta, field, None)
        if value:
            info[field] = value
    flags = {
        "sampling": bool(getattr(meta, "sampling_metadatas", ())),
        "subject_to_thresholding": bool(getattr(meta, "subject_to_thresholding", False)),
        "data_loss_from_other_row": bool(getattr(meta, "data_loss_from_other_row", False)),
    }
    info.update({k: v for k, v in flags.items() if v})
    if info:
        out["metadata"] = info
    # Reverse order so the most answer-changing alert ends up first.
    for key, text in reversed(METADATA_ALERTS):
        if flags.get(key):
            prepend_note(out, text)
    return out


# The default remedy assumes a runReport where dropping `dimensions` yields a
# single grand-total row. That escape hatch does not exist for every report
# type: a cohort report always carries auto-injected `cohort`/`cohortNthWeek`
# dimensions, so "query again with no dimensions" is impossible there. Callers
# that need different guidance pass their own remedy (see run_cohort_report).
_DEFAULT_NON_ADDITIVE_REMEDY = (
    "If you need a true total, query again for the same period with no dimensions."
)


def _add_non_additive_note(out, dim_headers, met_headers,
                           remedy=_DEFAULT_NON_ADDITIVE_REMEDY):
    """Attach a warning when a dimension-split result contains non-additive metrics.

    With no dimensions (a single total row), there's nothing to sum, so this
    is skipped. `remedy` is the closing sentence telling the reader how to get a
    correct total — the default fits runReport; cohort overrides it because its
    dimensions cannot be dropped.
    """
    if not dim_headers:
        return
    found = non_additive_metrics(met_headers)
    if not found:
        return
    out["non_additive_metrics"] = found
    dedup = [m for m in found if _non_additive_kind(m) == "dedup"]
    ratio = [m for m in found if _non_additive_kind(m) == "ratio"]
    sentences = []
    if dedup:
        sentences.append(
            "The following metrics are deduplicated values, so summing rows "
            f"overstates the true total: {', '.join(dedup)}."
        )
    if ratio:
        sentences.append(
            "The following are rates or averages, not counts — summing (or "
            "averaging) them across rows does not give a correct overall "
            f"figure: {', '.join(ratio)}."
        )
    # The remedy is "re-query with no dimensions" — correct for every
    # non-additive metric except the three rolling ratios, where that exact
    # re-query returns GA4's sum of the daily values rather than a period
    # ratio (measured twice; see _ROLLING_RATIO_METRICS). Handing a marketer
    # the instruction that produces the wrong number is worse than handing
    # them none, so name the exception here rather than relying on
    # add_rolling_ratio_note to contradict this sentence further down: that
    # note lives in the run_cli pipeline and cannot fire on a path that never
    # reaches it, while this sentence is written during shaping and always does.
    rolling = sorted(_ROLLING_RATIO_METRICS.intersection(found))
    if rolling:
        remedy = (
            f"{remedy} That last step does NOT work for {', '.join(rolling)} — a "
            "rolling day-by-day ratio comes back as GA4's sum of the daily values "
            "with no dimensions, not a period ratio. Read those per day instead."
        )
    prepend_note(out, " ".join(sentences) + f" {remedy}")
    # There are two groups of "note" producers. This is one of the *shaping*
    # producers, which run inside shape_report_response / shape_funnel_response
    # while the response is being built:
    #   - _add_response_metadata (sampled / withheld / "(other)" collapsed)
    #   - this one (non-additive metrics)
    #   - shape_report_response's empty-response note (headers and rows all empty)
    #   - shape_funnel_response's missing-steps note
    # _add_response_metadata runs first, so the others land above it via
    # prepend_note — correct, because it decides whether the numbers can be
    # quoted at all and the rest then read as detail. This one and the
    # empty-response note cannot both fire (one needs dim_headers, the other
    # needs them empty); the missing-steps note is funnel-only.
    #
    # The second group is the run_cli pipeline, and its order is defined by the
    # _NOTE_PIPELINE tuple rather than by prose — an earlier version of this
    # comment enumerated those producers too and went stale twice, once claiming
    # eight when there were fourteen. Do not restate them here.
    #
    # What still holds across both groups: every producer goes through
    # prepend_note rather than assigning "note" directly. Direct assignment is
    # what let one producer silently overwrite another, and a test now enforces
    # this mechanically (test_no_producer_bypasses_prepend_note).


def shape_report_response(resp, non_additive_remedy=_DEFAULT_NON_ADDITIVE_REMEDY):
    """Shape a RunReportResponse/RunRealtimeReportResponse into a common dict.

    Both response types share the same dimension_headers/metric_headers/rows
    structure, so reading by header index works for both. (pure Python — no
    google types needed)

    `non_additive_remedy` is forwarded to the non-additive-metrics note; cohort
    passes a cohort-specific one because its dimensions cannot be dropped.

    The response's row_count is 'the total number of matching rows', which
    differs from the row count actually returned once limit truncates rows.
    Dropping this value would make it impossible to tell whether a Top-N result
    is the whole dataset or a slice, silently leading to wrong conclusions — so
    total_row_count/truncated are appended only when truncation happened
    (the shape is unchanged when nothing was truncated).
    """
    dim_headers = [h.name for h in resp.dimension_headers]
    met_headers = [h.name for h in resp.metric_headers]
    rows = _shape_rows(resp.rows, dim_headers, met_headers)
    out = {
        "dimension_headers": dim_headers,
        "metric_headers": met_headers,
        "row_count": len(rows),
        "rows": rows,
    }
    # Some response types have no row_count, so guard with getattr.
    total = getattr(resp, "row_count", None)
    if total is not None and total > len(rows):
        out["total_row_count"] = total
        out["truncated"] = True
    _add_response_metadata(out, resp)
    _add_non_additive_note(out, dim_headers, met_headers, remedy=non_additive_remedy)
    # A no-dimension metrics-only query over a period/filter with zero
    # matching data comes back with headers AND rows both empty — GA4 omits
    # the usual single "totals" row entirely rather than returning one row
    # with a 0 value. Confirmed live on a production property: both a real
    # metric with a pre-launch date range (itemRevenue, 2020-01-01) and a
    # metric the property has simply never recorded (refundAmount) produced
    # this identical empty shape. Mutually exclusive with the non-additive
    # note above (that one requires dim_headers to be non-empty), so there's
    # no collision. Without this, the bare {"metric_headers": [], "rows": []}
    # reads exactly like something broke, when it usually just means "zero"
    # — a real risk of Claude telling the marketer "couldn't retrieve this"
    # instead of "zero for this period."
    if not dim_headers and not met_headers and not rows:
        # Phrased without asserting the request had no dimensions: this
        # function only ever sees the response, never the spec, so it cannot
        # actually know that. Observed for the metrics-only shape, but state
        # only what's true unconditionally and point at request.spec for the
        # rest.
        prepend_note(out, (
            "GA4 returned no headers or rows at all. This usually means zero matching data "
            "rather than a broken request — GA4 omits the totals row entirely instead of "
            "returning one with value 0. Check request.spec (below) for what was actually asked."
        ))
    return out


def shape_pivot_response(resp):
    """Shape a RunPivotReportResponse. (pure Python)

    rows has the same structure as shape_report_response, so it's reused; when
    metric_aggregations was requested, the resulting aggregates are filled in
    under a separate key in the same shape. The pivot axis dimension values
    themselves are already present in rows, so they're omitted from pivot_headers.

    Truncation is determined differently than for runReport-style responses.
    RunPivotReportResponse has **no** top-level row_count, so there's no single
    overall row count to report (hence total_row_count is not attached at the
    top level). Instead, cardinality is tracked per axis (observed):
    pivot_headers[i].row_count is the total number of values for that axis, and
    len(pivot_headers[i].pivot_dimension_headers) is the number actually
    returned. Comparing the two tells us whether each axis was truncated, so
    this is exposed as pivot_axes, and if any axis was truncated, a top-level
    truncated=True is attached (the shape is unchanged when nothing was
    truncated).

    Why the key is returned_values rather than returned: the top-level
    row_count in this same output counts the cross-product **rows** (axis 3 x
    axis 3 = 9), while this value counts that axis's **values** (3) — they
    count different things. Calling it returned would be misread as "3 rows
    returned", which would look like a contradiction between the two numbers.

    pivot_axes is in **request order** — axis i corresponds to
    request.spec.pivots[i]. Since run_cli always attaches request provenance to
    CLI output, each axis's field_names can be recovered from there, so its
    name isn't duplicated here.
    """
    out = shape_report_response(resp)
    aggregates = getattr(resp, "aggregates", None)
    if aggregates:
        out["aggregates"] = _shape_rows(aggregates, out["dimension_headers"], out["metric_headers"])

    axes = []
    for ph in getattr(resp, "pivot_headers", None) or []:
        returned = len(ph.pivot_dimension_headers)
        total = ph.row_count
        axes.append({
            "returned_values": returned,
            "total_row_count": total,
            "truncated": total > returned,
        })
    if axes:
        out["pivot_axes"] = axes
        if any(a["truncated"] for a in axes):
            out["truncated"] = True
    return out


def add_pivot_aggregation_note(result, spec):
    """Warn when metric_aggregations was requested but GA4 silently returned none.

    GA4 only populates the aggregates rows when `pivots` has 2 or more entries;
    with a single pivot it returns no aggregates and no error, so a requested
    total simply vanishes from the response (confirmed live). SKILL.md and the
    analysis guide document the trap, but nothing warned the reader when they
    actually hit it — the breakdown came back looking complete with the total
    silently absent. Rather than reject (the per-cell rows are valid and useful),
    flag it and name the fix. Takes the request spec because the shaped response
    alone cannot tell "no aggregates requested" from "aggregates dropped".
    """
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    pivots = spec.get("pivots")
    if not isinstance(pivots, list) or len(pivots) >= 2:
        return result
    wants_agg = any(isinstance(p, dict) and p.get("metric_aggregations") for p in pivots)
    if not wants_agg or result.get("aggregates"):
        return result
    # The closing "don't hand-sum" reason used to always blame deduplication
    # ("a deduplicated metric like users/sessions would come out too high"),
    # even for a query that only asked for an additive metric like eventCount —
    # where that specific claim is false, since summing an additive metric's
    # rows is normally fine. What's never safe regardless of the metric is
    # summing a *truncated* axis: the returned rows are only the top N, so the
    # sum undercounts whatever the limit left out. State whichever reason(s)
    # actually apply to this response instead of asserting one unconditionally.
    axis_truncated = any(a.get("truncated") for a in (result.get("pivot_axes") or []))
    dedup_present = bool(non_additive_metrics(result.get("metric_headers") or []))
    reasons = []
    if axis_truncated:
        reasons.append(
            "this axis was truncated, so the rows here don't cover every value "
            "in the first place"
        )
    if dedup_present:
        reasons.append(
            "a deduplicated metric here (users, sessions) would come out too "
            "high if summed across rows"
        )
    if not reasons:
        reasons.append(
            "summing by hand risks the exact mistake GA4's own total exists to "
            "avoid"
        )
    return prepend_note(result, (
        "metric_aggregations was requested but pivots has only one axis, so GA4 "
        "returned no aggregates row and no error — the requested total is absent "
        "from this response. GA4 fills aggregates only with 2 or more pivot axes. "
        "To get the total, add a second pivot axis over any dimension and re-run; "
        f"do not hand-sum the rows instead — {'; and '.join(reasons)}."
    ))


def _shape_funnel_sub(sub):
    """Shape one funnel sub-report (FunnelSubReport) into a dict. (pure Python)

    Unlike runReport-style responses, GA4 funnel sub-reports return more
    metric_headers than a row's actual metric_values (observed: duplicated 2x).
    Indexing values by header count would raise IndexError, so each row's
    values are mapped only up to its actual value count (the duplicated tail is
    dropped), and the output headers are likewise trimmed to that effective
    count so they line up with the row keys. shape_report_response's strict
    mapping is left as-is for report/realtime/pivot; only funnel gets this
    lenient handling.
    """
    dim_headers = [h.name for h in sub.dimension_headers]
    met_headers = [h.name for h in sub.metric_headers]
    rows = list(sub.rows)
    # Effective header count = the number of values a row actually carries
    # (observed to be uniform). With no rows, keep the headers as-is.
    n_dim = min(len(dim_headers), max((len(r.dimension_values) for r in rows), default=len(dim_headers)))
    n_met = min(len(met_headers), max((len(r.metric_values) for r in rows), default=len(met_headers)))
    eff_dim = dim_headers[:n_dim]
    eff_met = met_headers[:n_met]
    # Safe per-row mapping: even if some row has fewer values (non-uniform),
    # zip stops at the shorter side, so only the values present are captured,
    # with no IndexError.
    shaped = []
    for r in rows:
        row = {}
        for h, v in zip(eff_dim, r.dimension_values):
            row[h] = v.value
        for h, v in zip(eff_met, r.metric_values):
            row[h] = v.value
        shaped.append(row)
    out = {
        "dimension_headers": eff_dim,
        "metric_headers": eff_met,
        "row_count": len(shaped),
        "rows": shaped,
    }
    # FunnelSubReport carries its own metadata (FunnelResponseMetadata, whose
    # only field is sampling_metadatas), and it was being dropped — so a
    # sampled funnel presented estimates as exact counts with no warning at
    # all, while the identical situation on runReport got one. _add_response_
    # metadata reads every field through getattr, so the funnel's much smaller
    # metadata passes through it unchanged: currency_code/time_zone/
    # empty_reason/subject_to_thresholding/data_loss_from_other_row are simply
    # absent and skipped, leaving {"sampling": true} and the same alert text.
    # Reusing it rather than writing a funnel-specific version also keeps the
    # two paths from drifting apart in wording, and it is what lets
    # find_missing_dates_by_step's sampling guard work: that guard reads
    # result["metadata"]["sampling"], which until now no funnel ever had.
    _add_response_metadata(out, sub)
    return out


# GA4 marks the aggregate row inside a breakdown with a reserved dimension
# value rather than a separate field. In a funnel with funnel_breakdown, that
# total lands **in the same rows list** as the real breakdown values:
#
#   deviceCategory=RESERVED_TOTAL  activeUsers=392   <- the total
#   deviceCategory=mobile          activeUsers=235
#   deviceCategory=desktop         activeUsers=155
#   deviceCategory=tablet          activeUsers=2     (235+155+2 = 392)
#
# Two ways to be wrong, both quiet. Read as a category, "RESERVED_TOTAL" is a
# device nobody has ever heard of. Summed, the rows come to exactly twice the
# real figure because the total is counted alongside its own parts.
#
# Pivot has the same reserved values but keeps them in a separate `aggregates`
# key, which is why only the funnel path needed this. Documented for pivot in
# analysis-guide; the funnel case was in neither the code nor the docs.
RESERVED_DIMENSION_PREFIX = "RESERVED_"


def _reserved_total_kinds(sub):
    """(period_total_seen, breakdown_total_seen) for one funnel sub-report.

    Which COLUMN a RESERVED_TOTAL sits in decides which arithmetic caveat is
    true of it, and one response can carry both kinds. Shared by
    _flag_reserved_total_rows and shape_funnel_response's top-level pointer so
    the two can never disagree about the same rows — they did once, because
    each asked "is a dateRange header present" independently.
    """
    rows = sub.get("rows") if isinstance(sub, dict) else None
    headers = sub.get("dimension_headers") if isinstance(sub, dict) else None
    if not isinstance(rows, list) or not isinstance(headers, list):
        return False, False
    total = f"{RESERVED_DIMENSION_PREFIX}TOTAL"
    period = breakdown = False
    for row in rows:
        if not isinstance(row, dict):
            continue
        found = [row[h] for h in headers
                 if isinstance(row.get(h), str)
                 and row[h].startswith(RESERVED_DIMENSION_PREFIX)]
        if not found:
            continue
        if row.get("dateRange") == total:
            period = True
        elif total in found:
            breakdown = True
    return period, breakdown


def _flag_reserved_total_rows(sub):
    """Names the aggregate rows GA4 mixed into a breakdown, so they aren't summed."""
    rows = sub.get("rows")
    headers = sub.get("dimension_headers")
    if not isinstance(rows, list) or not isinstance(headers, list):
        return sub
    # Collect the values actually seen rather than asserting one. The check
    # matches the whole RESERVED_ prefix, and GA4 also emits RESERVED_(other) —
    # a leftover bucket, not a total. Naming it "RESERVED_TOTAL" and saying it
    # equals the sum of its neighbours would be two false statements about the
    # same row, on a path whose entire purpose is stopping a double count.
    total_rows, seen_values = [], []
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        found = [row[h] for h in headers
                 if isinstance(row.get(h), str)
                 and row[h].startswith(RESERVED_DIMENSION_PREFIX)]
        if found:
            total_rows.append(i)
            seen_values.extend(found)
    if not total_rows:
        return sub
    period_total_seen, breakdown_total_seen = _reserved_total_kinds(sub)
    sub["reserved_total_row_indexes"] = total_rows
    listed = ", ".join(sorted(set(seen_values)))
    n = len(total_rows)
    indexes = ", ".join(str(i) for i in total_rows)
    note = (
        (f"1 of these rows is a GA4 aggregate row, not a breakdown value — its "
         f"dimension reads {listed} (index {indexes})."
         if n == 1 else
         f"{n} of these rows are GA4 aggregate rows, not breakdown values — their "
         f"dimension reads {listed} (indexes {indexes}).")
        + " Do not report that as a category."
    )
    # The doubling warning belongs only to the TOTAL rows. RESERVED_(other) holds
    # what did not fit the breakdown, so it adds to the rest instead of repeating it.
    #
    # "equals the sum of its neighbours" only holds when the breakdown values are
    # mutually exclusive per user, true for a real dimension like deviceCategory
    # or appVersion (funnel_breakdown) but not for `dateRange` (2+ date_ranges
    # compared without funnel_breakdown): the same active user can show up in more
    # than one compared period, so they are counted once in RESERVED_TOTAL (the
    # deduplicated union across every period combined) but once per period in the
    # neighbour rows — the sum can come out HIGHER than the total, the opposite of
    # the doubling this warning exists to prevent. Measured live on an app-only
    # property, a 2-period session_start->mood_start funnel: step 1 read
    # RESERVED_TOTAL=75 against neighbour rows 47+42=89 (14 users active in both
    # periods); step 2 read RESERVED_TOTAL=14 against 11+6=17.
    #
    # The question is which COLUMN the RESERVED_TOTAL sits in, not whether a
    # dateRange column exists anywhere. Combining funnel_breakdown with 2+
    # date_ranges yields BOTH kinds in one response (measured live: rows read
    # platform=RESERVED_TOTAL/dateRange=RESERVED_TOTAL for the grand total,
    # platform=RESERVED_TOTAL/dateRange="this month" for that period's total,
    # and platform=Android/dateRange="this month" for the leaves). The first
    # version asked `"dateRange" in headers` and so applied the period caveat
    # to a breakdown-column total whose neighbours DO sum to it exactly — and
    # because the branches were if/elif, it suppressed the doubling warning
    # that is the entire reason this function exists. Both sentences can be
    # true of one response; emit each when its own kind is present.
    if period_total_seen:
        note += (
            f" A {RESERVED_DIMENSION_PREFIX}TOTAL in the dateRange column does NOT "
            "equal the sum of the per-period rows beside it: it is the deduplicated "
            "total across every compared period combined, and a user active in more "
            "than one period is counted once there but once per period beside it — "
            "so those rows can sum to MORE than the total. Do not expect them to "
            "match; read the total row directly instead."
        )
    if breakdown_total_seen and period_total_seen:
        # Both kinds in one response: name the contrast, since the sentence
        # just above says the opposite about the other column.
        note += (
            f" A {RESERVED_DIMENSION_PREFIX}TOTAL in a breakdown column is the "
            "opposite: it already equals the sum of the rows beside it, so adding "
            "it in with them comes out double. Leave it out of any manual total."
        )
    elif breakdown_total_seen:
        note += (
            f" Do not add the rows up either: a {RESERVED_DIMENSION_PREFIX}TOTAL "
            "row already equals the sum of the rows beside it, so a total taken "
            "over everything comes out double."
        )
    if any(v.endswith("(other)") for v in seen_values):
        note += (
            f" A {RESERVED_DIMENSION_PREFIX}(other) row is the opposite case — it is "
            "the leftover bucket GA4 collapsed the long tail into, so it belongs in a "
            "total but cannot be broken down any further."
        )
    return prepend_note(sub, note)


def shape_funnel_response(resp, step_names=None, platforms=None):
    """Shape a RunFunnelReportResponse. (pure Python)

    The two FunnelSubReports, funnel_table and funnel_visualization, are each
    shaped with _shape_funnel_sub. Only sub-reports with content (headers or
    rows present) are added to the output. Both are filled under either
    funnel_visualization_type (measured live, including with the key omitted
    entirely) — an earlier version of this comment claimed STANDARD_FUNNEL
    leaves funnel_visualization empty, which direct measurement disproved.
    The real difference: funnel_visualization carries a `date` dimension only
    under TRENDED_FUNNEL; under STANDARD_FUNNEL it's a funnelStepName-only
    overall summary whose activeUsers values match funnel_table's row for row
    when there is no funnel_breakdown (though funnel_visualization never
    carries funnel_table's funnelStepCompletionRate/Abandonments/
    AbandonmentRate metrics), and a smaller, breakdown-blind summary when a
    funnel_breakdown is present (measured: a 3-value platform breakdown on a
    2-step funnel gave funnel_table 6 rows and funnel_visualization 2).

    When step_names is given, missing steps are reported: GA4 omits the row for
    any step that zero users reached, so the response alone can't distinguish
    "the step is missing" from "the step had zero users". Rather than
    fabricating a zero-value row (which would mix API-provided values with
    inferred ones), we only report which step was absent.

    Do not assume missing steps form a trailing suffix — an open funnel can have
    zeros in the middle only (observed: with 2 of 3 steps present, rows "1. "
    and "3. " arrive). So the "N. " prefix (1-based step number) in each row
    label is parsed to identify which steps actually arrived. If even one label
    fails to parse, the whole determination is abandoned — better to say
    nothing than to confidently name the wrong step.
    (step_names is passed for breakdown funnels too. A populated breakdown
    table has several rows per step — one per breakdown value, sometimes plus
    RESERVED_TOTAL rows — so `len(seen) == len(rows)` below almost never
    holds there and the note stays silent, the same effective outcome as
    the old explicit suppression. What changes is a breakdown funnel with
    zero total rows: that used to get no explanation at all, because the
    caller never passed step_names for any breakdown funnel, populated or
    not — see run_funnel_report.)
    """
    out = {}
    table = getattr(resp, "funnel_table", None)
    if table is not None and (table.dimension_headers or table.metric_headers or table.rows):
        out["funnel_table"] = _shape_funnel_sub(table)
    viz = getattr(resp, "funnel_visualization", None)
    if viz is not None and (viz.dimension_headers or viz.metric_headers or viz.rows):
        out["funnel_visualization"] = _shape_funnel_sub(viz)

    for sub in ("funnel_table", "funnel_visualization"):
        if out.get(sub) is not None:
            _flag_reserved_total_rows(out[sub])
            # Same unset guard runReport gets, but with the aggregate rows excluded:
            # RESERVED_TOTAL / RESERVED_(other) are not categories, so leaving them in
            # would dilute a fully-unset breakdown into "partly unset" (see
            # find_unset_dimensions). Done after _flag_reserved_total_rows because it
            # needs the reserved_total_row_indexes that call writes. Reassign the
            # return value: add_unset_dimension_note builds a new dict (it adds the
            # unset_dimensions key by spreading), unlike _flag_reserved_total_rows
            # which mutates in place — discarding it would drop the detection.
            out[sub] = add_unset_dimension_note(
                out[sub], exclude_indexes=out[sub].get("reserved_total_row_indexes"),
                platforms=platforms)
            # Only funnel_visualization can carry a `date` axis (a TRENDED daily
            # trend); funnel_table never does, so this is a silent no-op there.
            out[sub] = add_missing_date_note_by_step(out[sub])

    # _flag_reserved_total_rows writes its detail note and reserved_total_row_indexes
    # INTO the sub-report, because those indexes are relative to that sub's own rows.
    # But every other warning on the funnel path — the missing-steps note below and
    # the pipeline's unsettled/metadata notes — lands on the top-level `note`, which
    # is what a summarising model reads first (see prepend_note's docstring on why a
    # buried point gets dropped). A reserved-total warning left only inside the
    # sub-report is the one most likely to be missed, and it guards the exact mistake
    # the mechanism exists to prevent: reading RESERVED_TOTAL as a category, or
    # summing across it to a doubled total. So surface a pointer at the top level too;
    # the authoritative indexes stay in the sub-report. (This and the missing-steps
    # note still don't collide in practice: reserved rows only exist when the table
    # has real data, and the missing-steps note's own guard — see
    # shape_funnel_response's docstring — stays silent on any populated breakdown
    # table. They diverge only on a fully empty table, where there is nothing to
    # flag as reserved in the first place.)
    flagged = [sub for sub in ("funnel_table", "funnel_visualization")
               if out.get(sub) and out[sub].get("reserved_total_row_indexes")]
    if flagged:
        # Passive voice ("are mixed into") sidesteps subject/verb agreement when
        # both subs are flagged (a TRENDED breakdown). Deliberately does NOT say
        # "never sum across them": RESERVED_(other) is the collapsed long tail and
        # DOES belong in a total (only RESERVED_TOTAL must be left out of a manual
        # sum). The per-row detail lives in the sub-report note, so the pointer
        # defers there rather than over-claiming here.
        #
        # "equals the sum" only holds for a RESERVED_TOTAL in a real breakdown
        # column; one in the dateRange column is the deduplicated union across
        # periods and its neighbours can sum to MORE. Both kinds can appear in
        # one response (funnel_breakdown + 2 date_ranges), so this reads the
        # same shared determination the sub-report note uses rather than
        # re-deriving it from the headers — asking each independently is how
        # the two came to contradict each other on the 3-way shape.
        period_seen = any(_reserved_total_kinds(out[sub])[0] for sub in flagged)
        breakdown_seen = any(_reserved_total_kinds(out[sub])[1] for sub in flagged)
        clauses = []
        if breakdown_seen:
            clauses.append(
                "a RESERVED_TOTAL in a breakdown column already equals the sum of "
                "its neighbours, so adding it in doubles the total")
        if period_seen:
            clauses.append(
                "a RESERVED_TOTAL in the dateRange column does not equal the sum of "
                "the per-period rows beside it — a user active in more than one "
                "period is counted once there but once per period beside it")
        parenthetical = "; ".join(clauses) if clauses else (
            "see that note for how each reserved value behaves")
        prepend_note(out, (
            "GA4 aggregate rows (RESERVED_TOTAL / RESERVED_(other)) are mixed into "
            f"the breakdown values in {' and '.join(flagged)} — exclude them before "
            "ranking or totalling the breakdown. See that sub-report's note and "
            "reserved_total_row_indexes for which rows they are and how each behaves "
            f"({parenthetical})."
        ))

    # Surface a fully-unset breakdown at the top level too, for the same reason the
    # reserved pointer above exists: "every breakdown row reads (not set)" is a
    # tracking gap the marketer would otherwise read as a business result, and a
    # note buried in the sub-report is the one most likely to be skipped. Prepended
    # after the reserved pointer so it lands above it — a whole-dimension gap is the
    # more consequential of the two. Partly-unset stays in the sub-report only (a
    # few unset rows beside real values is the ordinary coupon-style case, not a
    # gap). funnelStepName is excluded — it is the step label, never a breakdown.
    unset_subs = [sub for sub in ("funnel_table", "funnel_visualization")
                  if out.get(sub)
                  and (out[sub].get("unset_dimensions") or {}).get("fully_unset")]
    unset_dims = sorted({d for sub in unset_subs
                         for d in out[sub]["unset_dimensions"]["fully_unset"]
                         if d != "funnelStepName"})
    if unset_dims:
        prepend_note(out, (
            f"Every breakdown row for {', '.join(unset_dims)} reads \"(not set)\" in "
            f"{' and '.join(unset_subs)} — GA4 received no value on any of them, so "
            "this breakdown carries no information. The event is firing but the "
            "parameter is never attached; report it as a tracking gap, not as a "
            "result."
        ))

    # Surface a TRENDED funnel's per-step date gaps at the top level too, same
    # reasoning as the two pointers above — a gap that reads as "data failed to
    # come back" instead of "zero users that day" changes the answer, and the
    # detail already lives in funnel_visualization's own note. Prepended last so
    # it lands on top: a mis-read daily trend is at least as consequential as the
    # other two, and this is the only one of the three that speaks to a business
    # zero being silently dropped from an average or a chart rather than to how
    # to read a label.
    step_gaps = (out.get("funnel_visualization") or {}).get("missing_dates_by_step")
    if step_gaps:
        prepend_note(out, (
            f"funnel_visualization is missing some daily rows for "
            f"{', '.join(sorted(step_gaps))} — see that sub-report's note and "
            "missing_dates_by_step for which days. GA4 drops a day's row for a "
            "step when zero users reached it that day, so treat those as real "
            "zeros, not as data that failed to come back."
        ))

    # Sampling goes last, so it lands ABOVE all three pointers above. The same
    # ordering _add_response_metadata uses on the runReport path, for the same
    # reason: the others say how to read a number, this one says whether the
    # number can be quoted as exact at all. Until FunnelSubReport.metadata was
    # plumbed through _shape_funnel_sub, a sampled funnel presented estimates
    # as counts with no warning anywhere; now the alert exists in the sub, and
    # this raises it to where a summarising model actually reads.
    sampled_subs = [sub for sub in ("funnel_table", "funnel_visualization")
                    if (out.get(sub) or {}).get("metadata", {}).get("sampling")]
    if sampled_subs:
        prepend_note(out, (
            f"GA4 answered {' and '.join(sampled_subs)} from a sampled subset, so "
            "every figure in it is an estimate, not an exact count. Say so when "
            "reporting them, and do not present a small difference between two of "
            "them — or a step-to-step drop — as a real one."
        ))

    table_out = out.get("funnel_table")
    if step_names and table_out is not None:
        rows = table_out.get("rows", [])
        seen = set()
        for r in rows:
            idx = str(r.get("funnelStepName", "")).partition(".")[0].strip()
            if idx.isdigit():
                seen.add(int(idx) - 1)
        # Trust this only when every label was successfully parsed (abandon the
        # determination on a parse failure or duplicate index).
        if len(seen) == len(rows):
            missing = [n for i, n in enumerate(step_names) if i not in seen]
            if missing:
                out["steps_without_data"] = missing
                # Goes through prepend_note like every other producer. Nothing
                # else writes "note" on the funnel path today, but the direct
                # assignment this replaces is precisely the shape that let one
                # producer overwrite another elsewhere — and a test now enforces
                # that no producer writes the key by hand.
                prepend_note(out, (
                    f"Only {len(seen)} of the {len(step_names)} requested steps are in the response. "
                    f"The rest ({', '.join(missing)}) have no row in the response — GA4 omits the row "
                    "for any step that zero users reached, so this usually means zero users."
                ))
    return out


# ---- incompatible dimension/metric diagnosis ---------------------------------
#
# GA4 refuses certain dimension/metric combinations, and its own message is often
# unusable. Asking for totalRevenue together with itemRevenue returns, verbatim
# (observed on a live property):
#
#     "Please remove  to make the request compatible for example."
#
# The slot naming the field to remove is **empty**. That is worse than no message
# for our audience: format_api_error's generic hint says the error above usually
# states the cause directly, so it points the marketer at a blank. And this is not
# an exotic request — "show me total revenue and revenue per product" is a normal
# ecommerce question, because item-scoped revenue and event-scoped revenue simply
# cannot be summed in one report.
#
# Do NOT try to "simplify" this by parsing the field name out of GA4's message.
# It is unusable for two independently measured reasons. First, the name is
# empty for a whole set of metrics (totalRevenue, purchaseRevenue, itemRevenue,
# averagePurchaseRevenue — 12 of 33 observed failures carried no name at all).
# Second, when it *is* populated it names whichever conflicting field came first
# in the request, not the one at fault: [grossItemRevenue, eventCount] blames
# grossItemRevenue and [eventCount, grossItemRevenue] blames eventCount — same
# conflict, opposite verdict. It is *a* fix, never *the* fix.
#
# The Data API has a checkCompatibility RPC, but it cannot be handed the failing
# request: given an incompatible set it raises the same error instead of
# explaining it. What it *does* answer, for a request it accepts, is "which fields
# would break this one if you added them". So we ask it once per requested field
# in isolation, then intersect each answer with what the user actually asked for.
# A field appearing on both sides is a real conflict we can name.
#
# Verified on a live property: {totalRevenue, itemRevenue} -> names that pair;
# {itemName, sessions, totalRevenue} -> names (itemName, totalRevenue); and the
# compatible {sessions, itemRevenue} -> names nothing. Reporting no pair when
# there is no conflict matters as much as naming one when there is: a diagnosis
# that invents culprits would be another confident-but-wrong answer.

INCOMPATIBILITY_SIGNALS = (
    "dimensions & metrics are incompatible",    # runReport, observed
    "dimensions and metrics are incompatible",  # checkCompatibility, observed
)

# Each field costs one API call, all on an already-failing path. A spec this wide
# is not the ecommerce scope-mixing case this diagnosis exists for, and burning
# 30 calls to explain one error helps nobody.
MAX_DIAGNOSED_FIELDS = 12


def is_incompatibility_error(message) -> bool:
    low = str(message).lower()
    return any(sig in low for sig in INCOMPATIBILITY_SIGNALS)


def diagnosable_field_names(spec):
    """(dimensions, metrics) reduced to plain API names, for compatibility checks.

    Metrics may be given as objects; a {"expression": ...} metric is computed
    rather than named, so there is nothing to look up and it is dropped. Dropping
    it only costs us a diagnosis, whereas passing it on would make the RPC fail
    and cost us the whole diagnosis.
    """
    return _spec_names(spec.get("dimensions")), _spec_names(spec.get("metrics"))


def find_incompatible_pairs(property_id, spec, client=None):
    """Names the conflicting (field, field) pairs behind an incompatibility error.

    Returns a sorted list of pairs, or [] when nothing could be pinned down —
    including when the diagnosis itself fails. This runs while we are already
    reporting an error, so it must never raise: a broken diagnosis would replace
    a bad error message with no error message at all.
    """
    from google.analytics.data_v1beta.types import (
        CheckCompatibilityRequest,
        Compatibility,
        Dimension,
        Metric,
    )

    dims, mets = diagnosable_field_names(spec)
    fields = [(d, True) for d in dims] + [(m, False) for m in mets]
    if not fields or len(fields) > MAX_DIAGNOSED_FIELDS:
        return []

    if client is None:
        # Inside the per-field try below this would already be covered, but the
        # client is built once, outside it. That mattered: this function runs from
        # run_cli's `except` block, so an exception here raises *during* handling
        # of the original error and both escape as a raw traceback with no JSON at
        # all — the marketer loses the GA4 message they were owed and gets a stack
        # trace instead. load_credentials refreshes and rewrites an expired token,
        # so RefreshError and OSError are ordinary outcomes, not exotic ones.
        from ga4_common import get_data_client
        try:
            client = get_data_client()
        except Exception:  # noqa: BLE001 - see docstring: diagnosis must not raise
            return []

    requested = {name for name, _ in fields}
    pairs = set()
    for name, is_dimension in fields:
        try:
            resp = client.check_compatibility(CheckCompatibilityRequest(
                property=f"properties/{property_id}",
                dimensions=[Dimension(name=name)] if is_dimension else [],
                metrics=[] if is_dimension else [Metric(name=name)],
                compatibility_filter=Compatibility.INCOMPATIBLE,
            ))
        except Exception:  # noqa: BLE001 - see docstring: diagnosis must not raise
            continue
        blocked = (
            {x.dimension_metadata.api_name for x in resp.dimension_compatibilities}
            | {x.metric_metadata.api_name for x in resp.metric_compatibilities}
        )
        for other in requested & blocked:
            pairs.add(tuple(sorted((name, other))))
    return sorted(pairs)


def incompatibility_hint(pairs):
    """Turns conflicting pairs into an instruction, or None if there are none."""
    if not pairs:
        return None
    listed = "; ".join(f"{a} + {b}" for a, b in pairs)
    return (
        f"GA4 cannot combine these in one report: {listed}. "
        "Item-level fields (itemName/itemCategory/itemId, itemRevenue, "
        "grossItemRevenue) cannot share a report with order-level ones "
        "(totalRevenue, purchaseRevenue, averagePurchaseRevenue, transactions, "
        "ecommercePurchases, eventCount) — one order covers several items, so the "
        "two cannot be summed in one table. "
        "Session/user metrics (sessions, totalUsers, purchaserRate) and item "
        "*count* metrics (itemsPurchased, itemsViewed, itemsAddedToCart, "
        "cartToViewRate) are unaffected and can stay in either half. "
        "Re-run the conflicting half as a second query and report the numbers "
        "side by side; do not reconcile them into one row."
    )


# ---- a funnel reaching past the property's data retention -------------------
#
# Google: the data retention setting "does not affect standard aggregated
# reports ... The data retention setting only affects explorations and funnel
# reports" (support.google.com/analytics/answer/7667196, checked 2026-07-22).
# runFunnelReport is a funnel report, so it is limited; runReport is not.
#
# Measured on a live property set to 14 months, for January 2025:
#   runReport   add_to_cart 783, purchase 136
#   funnel      row_count 0, no error
#
# The wrong answer is bad on its own — "nobody converted last January" — but
# what makes it worse is that shape_funnel_response's own missing-steps note
# then says GA4 omits steps with zero reach, "so this usually means zero users".
# The reassurance lands on top of the wrong number.
#
# Only relative start dates are judged by offset; absolute ones are compared
# against today in UTC, which can be a day out from the property's timezone.
# At a 14-month boundary a day does not change the verdict, and the note is
# phrased as a likely cause rather than a certainty.
_MONTH_DAYS = 30.44

# shape_funnel_response's missing-steps note (built before retention is known)
# asserts zero reach outright: "GA4 omits the row for any step that zero users
# reached, so this usually means zero users." When add_funnel_retention_note
# below also fires on the same empty response, that assertion sits directly
# under a note explaining the emptiness is "most likely" the retention
# boundary, not that nobody converted — two notes on one response, the second
# undoing the first. Observed live: a January 2025 funnel on a 14-month
# property carried both, unresolved. Softening the claim here (rather than
# suppressing it at the source) keeps shape_funnel_response ignorant of
# retention, which it has no way to check without config.
_ZERO_USERS_CLAIM = "so this usually means zero users."
_ZERO_USERS_DEFUSED = (
    "which is also true once the retention boundary above applies — it does "
    "not by itself confirm zero conversions."
)


def _defuse_zero_users_claim(note):
    if not note or _ZERO_USERS_CLAIM not in note:
        return note
    return note.replace(_ZERO_USERS_CLAIM, _ZERO_USERS_DEFUSED)


def funnel_exceeds_retention(spec, retention_months):
    """Days by which the funnel's start predates retention, or None if it doesn't."""
    from datetime import date

    if not retention_months or not isinstance(spec, dict):
        return None
    ranges = spec.get("date_ranges") or []
    if not isinstance(ranges, list):
        return None
    limit = int(retention_months * _MONTH_DAYS)
    worst = None
    for entry in ranges:
        if not isinstance(entry, dict):
            continue
        start = entry.get("start_date")
        offset = _day_offset(start)
        if offset is None:
            try:
                offset = (date.today() - date.fromisoformat(str(start))).days
            except (TypeError, ValueError):
                continue
        if offset > limit:
            beyond = offset - limit
            worst = beyond if worst is None else max(worst, beyond)
    return worst


def add_funnel_retention_note(result, spec, retention_months):
    """Explains an empty funnel that is really a retention boundary, not a zero.

    Registered in the shared NOTE_PIPELINE that runs for every ga-use script, so
    it must gate on actually being a funnel call itself — `spec.get("steps")` is
    the one field only a funnel spec carries. Without this, `funnel_exceeds_retention`
    only looks at `date_ranges` vs the property's retention setting, which says
    nothing about whether this is a funnel; a plain ga4_query.py/ga4_pivot.py call
    with a `date_ranges` list reaching that far back and an empty result (headers
    and rows both empty — routine for a pre-launch period) tripped `beyond is not
    None` with `table` staying None (`empty` False), falling into the "partly
    beyond retention" branch and attaching a note that talks about "this funnel's
    period" and tells the reader to "answer through ga4_query.py" from inside the
    ga4_query.py response itself. Measured live: `{"metrics": ["itemRevenue"],
    "date_ranges": [{"start_date": "2020-01-01", "end_date": "2020-01-07"}]}`
    through both ga4_query.py and ga4_pivot.py.
    """
    if not isinstance(result, dict) or not isinstance(spec, dict) or "steps" not in spec:
        return result
    table = result.get("funnel_table")
    empty = isinstance(table, dict) and not table.get("rows")
    beyond = funnel_exceeds_retention(spec, retention_months)
    if beyond is None:
        # An empty funnel with no retention value to check against is the exact
        # situation this whole check exists for, arriving with the check turned
        # off. retention_months comes from the saved config, and it is absent
        # whenever the property was selected before ga-auth started storing it or
        # the Admin lookup failed (ga4_admin.py swallows that failure by design so
        # it does not cost the currency and timezone). Staying silent hands the
        # floor to the steps_without_data note, which says zero reach "usually
        # means zero users" — a confident wrong answer. Say the check did not run.
        if empty and not retention_months:
            return prepend_note(result, (
                "This funnel returned nothing, and the property's data retention "
                "setting is not on file, so it could not be checked. Beyond retention "
                "a funnel returns zero rows with no error, which looks identical to "
                "nobody converting. Before reporting zero, run the same period through "
                "ga4_query.py — retention does not limit standard reports. Re-selecting "
                "the property with the ga-auth skill records the setting and turns this "
                "check on."
            ), rewrite=_defuse_zero_users_claim)
        return result
    lead = (
        "This funnel returned nothing, and its period starts about "
        f"{beyond} day(s) before the property's {retention_months}-month data "
        "retention. That is the most likely reason — not that nobody converted. "
        if empty else
        "Part of this funnel's period predates the property's "
        f"{retention_months}-month data retention (by about {beyond} day(s)), so it "
        "only covers the part inside the window. "
    )
    return prepend_note({**result, "beyond_retention_days": beyond}, lead + (
        "Retention limits funnels and explorations but NOT standard reports, so the "
        "same period still answers through ga4_query.py — use it to check whether the "
        "events were there, and say the funnel cannot reach that far rather than "
        "reporting zero conversions."
    ), rewrite=_defuse_zero_users_claim)


# ---- data GA4 has not finished processing -----------------------------------
#
# Google states that GA4 "data processing can take 24-48 hours. During that time,
# data in your reports may change" (support.google.com/analytics/answer/11198161,
# checked 2026-07-22), with daily data typically settling around 18 hours and
# intraday running 2-6 hours behind. It is explicitly not an SLA.
#
# So a report whose period reaches today or yesterday is a moving figure. The
# wrong answer that produces is specific and common: "yesterday's revenue fell
# 30%" when yesterday simply has not finished arriving. A marketer acts on that
# — pauses a campaign, escalates to a developer — over a number that will be
# higher tomorrow.
#
# Only the relative forms are judged, because their distance from today is
# arithmetic and needs no timezone. An absolute date would have to be compared
# against "today in the property's timezone", and this process should not be
# guessing at that; anyone writing an absolute date for yesterday computed it
# deliberately anyway.
UNSETTLED_DAYS = 2


def unsettled_range_ends(spec):
    """Range labels whose end date is recent enough that GA4 may still change it."""
    out = []
    ranges = (spec.get("date_ranges") if isinstance(spec, dict) else None) or []
    for i, entry in enumerate(ranges):
        if not isinstance(entry, dict):
            continue
        offset = _day_offset(entry.get("end_date"))
        if offset is not None and offset < UNSETTLED_DAYS:
            out.append(entry.get("name") or f"date_range_{i}")
    return out


def add_unsettled_data_note(result, spec):
    """Warns that the most recent days in the period are still being processed."""
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    labels = unsettled_range_ends(spec)
    if not labels:
        return result
    return prepend_note({**result, "unsettled_ranges": labels}, (
        f"The period(s) {', '.join(labels)} run up to today or yesterday, and GA4 "
        "keeps processing for 24-48 hours — these figures will still change. Do not "
        "report a drop in the most recent day(s) as a real decline; say the data is "
        "still settling, or end the period two days back for a number that will hold."
    ))


# ---- a cohort offset that hasn't fully elapsed yet ---------------------------
#
# The check above never fires for a cohort request: it reads spec["date_ranges"],
# and cohorts use spec["date_range"] (singular) + spec["offsets"] instead — a
# different shape entirely, so unsettled_range_ends always returns [] for them.
#
# Measured live: a WEEKLY cohort acquired 2026-08-01..08-07 with offsets 0-3
# (today 2026-08-26, so offset 3 covers 08-22..08-28, a week still in progress)
# came back with only 3 rows (offsets 0-2) — offset 3's row was silently
# missing, indistinguishable from "the cohort had zero users return that week".
# It hasn't happened yet; there's nothing to have measured.
#
# Cohort dates are absolute-only (SKILL.md), which the reasoning above treats
# as a deliberate choice not worth second-guessing — but that argument assumed
# a *choice* between relative and absolute forms. Cohorts have no relative
# option, so an absolute end_date here carries no signal about intent, and this
# check has to compare against today anyway. Same UTC-vs-property-timezone
# caveat as funnel_exceeds_retention: off by at most a day, which does not
# change the verdict except within a day of the boundary.
_GRANULARITY_DAYS = {"DAILY": 1, "WEEKLY": 7, "MONTHLY": _MONTH_DAYS}


def cohort_offset_unsettled(spec):
    """True if the cohort's furthest requested offset window has not fully
    elapsed. Only judges the shorthand date_range/offsets shape; a spec using
    full cohort_spec control returns False (nothing to guess safely there)."""
    from datetime import date, timedelta

    if not isinstance(spec, dict):
        return False
    date_range = spec.get("date_range")
    offsets = spec.get("offsets")
    if not isinstance(date_range, dict) or not isinstance(offsets, dict):
        return False
    try:
        end_date = date.fromisoformat(str(date_range.get("end_date")))
    except (TypeError, ValueError):
        return False
    last_offset = offsets.get("end")
    if not isinstance(last_offset, (int, float)) or isinstance(last_offset, bool):
        return False
    unit = _GRANULARITY_DAYS.get(str(spec.get("granularity", "DAILY")).upper(), 1)
    # build_cohort_request's own checks (as_int, _check_offsets_window) reject
    # a non-integer or negative offset before any request reaches GA4, but
    # neither bounds its size — and timedelta raises OverflowError/ValueError
    # on a value that large (or on NaN/inf, which as_int already excludes but
    # a future caller of this function directly might not). decorate_result's
    # pipeline would swallow that silently (see the NameError story on
    # add_funnel_retention_note's own pipeline entry) rather than crash, but
    # "silently never runs" is the exact failure that story exists to avoid.
    try:
        window_end = end_date + timedelta(days=unit * last_offset)
    except (OverflowError, ValueError):
        return False
    return window_end >= date.today() - timedelta(days=UNSETTLED_DAYS)


def add_cohort_unsettled_note(result, spec):
    """Warns when the furthest offset's window hasn't fully elapsed — its row
    may be missing entirely or still settling, not evidence of zero return."""
    if not isinstance(result, dict) or not cohort_offset_unsettled(spec):
        return result
    return prepend_note(result, (
        "The furthest offset requested falls within the last "
        f"{UNSETTLED_DAYS} day(s), or its window has not fully elapsed yet. GA4 "
        "either omits that offset's row entirely or returns it still settling "
        "(24-48 hour processing) — a missing row or low count there is not yet "
        "evidence of lower retention. Re-run once the window is fully in the past."
    ))


# ---- comparing two periods --------------------------------------------------
#
# Two separate ways a period-over-period question comes back wrong, both
# measured on a live property with the exact shape the guide recommends
# (28daysAgo..today vs 56daysAgo..29daysAgo).
#
# 1. Unequal lengths. "28daysAgo..today" is 29 days (both ends inclusive) while
#    "56daysAgo..29daysAgo" is 28. So the recommended comparison puts 29 days
#    against 28 and any "up/down X%" carries a spare day. Lengths are pure
#    arithmetic on the offsets — no timezone needed, which matters because this
#    process does not know the property's.
#
# 2. Zero-filled rows. With two ranges AND a `date` dimension, GA4 returns the
#    cross product: every date against every range, filling 0 where the date
#    falls outside that range. Measured: 57 rows per range for 29 and 28 real
#    days. Averaging over the returned rows gave 588 sessions/day against a true
#    1155 — half. And each 0 reads as "no traffic that day" rather than "that
#    day is not in this period".
#
# Membership is deliberately not computed. Telling a real zero inside the range
# from an out-of-range zero needs the property's timezone to resolve "today",
# and an off-by-one near midnight would be worse than the warning it replaces.
# The cross-product shape is deterministic, so the warning is stated from the
# request alone.
_DAYS_AGO = _re.compile(r"^(\d+)daysAgo$")


def _day_offset(value):
    """Days before today for a GA4 relative date, or None if not one."""
    if not isinstance(value, str):
        return None
    value = value.strip()
    if value == "today":
        return 0
    if value == "yesterday":
        return 1
    m = _DAYS_AGO.match(value)
    return int(m.group(1)) if m else None


def date_range_lengths(spec):
    """{range label: length in days} for ranges whose length can be computed exactly."""
    from datetime import date

    out = {}
    ranges = (spec.get("date_ranges") if isinstance(spec, dict) else None) or []
    for i, entry in enumerate(ranges):
        if not isinstance(entry, dict):
            continue
        label = entry.get("name") or f"date_range_{i}"
        start, end = entry.get("start_date"), entry.get("end_date")
        so, eo = _day_offset(start), _day_offset(end)
        if so is not None and eo is not None:
            out[label] = so - eo + 1
            continue
        # A mixed range ("2026-06-01" to "yesterday") used to be dropped, and
        # dropping it silenced the whole check: with only one range left
        # measurable there is nothing to compare, so an unequal pair produced no
        # warning at all — not "lengths differ", not "could not check". Resolving
        # the relative side against today is the same approximation
        # funnel_exceeds_retention already makes a few hundred lines up; refusing
        # it only here was an inconsistency, and a day of timezone skew cannot
        # turn a 28-day period into a 30-day one.
        sd, ed = _as_date(start), _as_date(end)
        if sd is None or ed is None:
            continue                            # unrecognised: say nothing
        out[label] = (ed - sd).days + 1
    return out


def _as_date(value):
    """A relative ("28daysAgo") or absolute ("2026-06-01") date as a date object."""
    from datetime import date, timedelta

    offset = _day_offset(value)
    if offset is not None:
        return date.today() - timedelta(days=offset)
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def has_approximate_range(spec):
    """True when some range mixes a relative end with an absolute one.

    Such a length is resolved against *this machine's* today, while GA4 resolves
    it in the property's timezone — so it can be one day out either way. That
    uncertainty is why these ranges used to be dropped entirely, but dropping
    them silenced the comparison instead of qualifying it. Keeping the length and
    raising the warning threshold to more than a day preserves the original
    caution without losing the check: the mismatches worth catching are someone
    comparing 30 days against 7, not 28 against 29.
    """
    for entry in (spec.get("date_ranges") if isinstance(spec, dict) else None) or []:
        if not isinstance(entry, dict):
            continue
        rel = [_day_offset(entry.get(k)) is not None for k in ("start_date", "end_date")]
        if rel[0] != rel[1]:
            return True
    return False


def add_period_comparison_notes(result, spec):
    """Warns about unequal periods and about GA4's zero-filled cross-product rows."""
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    ranges = spec.get("date_ranges") or []
    if not isinstance(ranges, list) or len(ranges) < 2:
        return result

    # Applied in ascending priority, like the run_cli pipeline: prepend_note puts
    # the newest note on top, so the zero-fill warning is applied LAST to lead.
    # These two were the other way round, which contradicted this module's own
    # measurement — zero-fill halves the daily average (588 against a true 1155
    # in the note below's source), while an unequal length is off by one day out
    # of twenty-eight. Ranking the smaller error first is exactly the "most
    # answer-changing note first" rule inverted.
    out = result

    lengths = date_range_lengths(spec)
    values = set(lengths.values())
    # A one-day spread is within the timezone uncertainty of an approximated
    # range, so it is not evidence of anything there. With every range measured
    # exactly, one day is a real difference and still worth saying.
    spread = max(values) - min(values) if values else 0
    threshold = 1 if has_approximate_range(spec) else 0
    if len(values) > 1 and spread > threshold:
        listed = ", ".join(f"{name} {n}d" for name, n in lengths.items())
        approx = (" One of these periods mixes a relative end with an absolute one, so "
                  "its length is resolved against this machine's date and may be a day "
                  "out; check it against the property's timezone before quoting it."
                  if has_approximate_range(spec) else "")
        out = prepend_note({**out, "date_range_lengths": lengths}, (
            f"The periods being compared are different lengths ({listed}), so any "
            "up/down percentage between them includes the extra day(s) rather than a "
            "real change. Note that a range ending at `today` also counts today, which "
            "is still in progress. For an equal comparison use yesterday as the end "
            "(e.g. 28daysAgo..yesterday against 56daysAgo..29daysAgo)." + approx
        ))

    headers = out.get("dimension_headers")
    if isinstance(headers, list) and "date" in headers:
        out = prepend_note({**out}, (
            "This is 2+ date ranges crossed with a date dimension, so GA4 returns "
            "every date against every range and fills 0 where the date is outside "
            "that range. Those zeros mean \"not in this period\", not \"no activity\" "
            "— averaging over the returned rows lands about half the real daily "
            "figure. Average over the days that belong to each range, or drop the "
            "date dimension when you only need the period totals."
        ))
    return out


# ---- ratios built with a metric expression ----------------------------------
#
# _is_non_additive judges by name, which cannot work for a computed metric: the
# author names it. `{"name": "cvr", "expression": "keyEvents/sessions"}` is a
# conversion rate and matched none of the name rules, so it came back with no
# warning at all. Measured live: summing that cvr across nine channels gave
# 0.2470 against a true overall rate of 0.0220 — off by more than 10x.
#
# This is on the documented happy path, not an edge case. analysis-recipes tells
# the reader to "compute ratios via expression", so following the guide produced
# exactly the unflagged ratio the rest of this module exists to prevent.
#
# The signal here is structural rather than a name guess: an expression that
# divides yields a ratio, whatever it is called. Addition and subtraction of
# additive metrics stay additive, so only division counts.
_DIVIDING_EXPRESSION = _re.compile(r"/")


def _metric_requests(spec):
    """(requested names, {name: expression}) parsed from a spec's metrics list.

    One walk, three consumers: expression_ratio_metrics and the P16/P19
    expression notes each need both "which names were requested" and "which
    metrics are expressions". Name extraction delegates to _metric_names so
    the accepted item shapes (a string entry, or {"name": ...}) stay defined
    in exactly one place — if a third notation appears, all three consumers
    learn it at once instead of drifting against each other.
    """
    requested = set(_metric_names(spec))
    expressions = {}
    for item in (spec.get("metrics") if isinstance(spec, dict) else None) or []:
        if isinstance(item, dict):
            name, expression = item.get("name"), item.get("expression")
            if isinstance(name, str) and isinstance(expression, str):
                expressions[name] = expression
    return requested, expressions


def expression_ratio_metrics(spec):
    """Names of spec metrics whose expression divides — ratios by construction."""
    _, expressions = _metric_requests(spec)
    return [name for name, expression in expressions.items()
            if _DIVIDING_EXPRESSION.search(expression)]


# ---- dauPerMau/dauPerWau/wauPerMau: a "safe total" that isn't one ----------
#
# Every other non-additive metric in this codebase is safe in the no-dimension
# case — that is the whole basis for _add_non_additive_note's "with no
# dimensions there's nothing to sum, skip" rule, and for the "query again
# with no dimensions" remedy recommended everywhere else in this file. These
# three are the one confirmed exception: they are rolling day-by-day ratios,
# and GA4's own aggregation for them over a multi-day period is a SUM of the
# daily values, not a period-level ratio — even when no dimension was asked
# for and the response looks like a clean single total row.
#
# Measured live, twice: a 6-day dauPerWau query with no dimensions returned
# ~1.29206349. The same six days queried broken out by `date` and summed by
# hand gave the identical value to double-precision float precision.
# dauPerMau reproduced the same pattern (2.14... vs. the hand-summed
# daily values for a 30-day window). wauPerMau is assumed to share it, being
# structurally identical, but has not been measured directly.
_ROLLING_RATIO_METRICS = {"dauPerMau", "dauPerWau", "wauPerMau"}


def add_rolling_ratio_note(result, spec):
    """Warns that dauPerMau/dauPerWau/wauPerMau over a multi-day period is
    GA4's own sum of daily values, not a period ratio — true even with no
    `date` dimension, the one case every other metric here calls safe."""
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    headers = result.get("metric_headers")
    if not isinstance(headers, list):
        return result
    found = sorted(_ROLLING_RATIO_METRICS & set(headers))
    if not found:
        return result
    dims = result.get("dimension_headers")
    if isinstance(dims, list) and "date" in dims:
        return result  # each row is already a single day; the value is meaningful per row
    lengths = date_range_lengths(spec)
    if not lengths or not any(v > 1 for v in lengths.values()):
        return result  # a single-day range has nothing to sum
    return prepend_note(result, (
        f"{', '.join(found)} {'is' if len(found) == 1 else 'are'} a rolling "
        "day-by-day ratio. Requesting it over a period longer than one day — "
        "even with no `date` dimension, where every other metric in this "
        "response would give a clean total — returns GA4's own sum of the "
        "daily values, not a period-level ratio (measured live: the same "
        "days queried broken out by date and added by hand matched the "
        "no-dimension response exactly). To read this metric, request it for "
        "a single day, or break it out by `date` and read each day on its "
        "own — do not trust the aggregate for a multi-day period."
    ))


# ---- sorting a weekday name alphabetically, not by calendar order -----------
#
# hour/minute (see _NUMERIC_STRING_DIMENSIONS above) can be fixed server-side
# with NUMERIC order type because they are numeric strings. dayOfWeekName is
# text ("Monday", "Friday", ...) — there is no NUMERIC reading of it, and the
# calendar-correct sort key is a different dimension, `dayOfWeek` (0=Sunday..
# 6=Saturday). GA4 rejects ordering by a dimension that is not in the request's
# own `dimensions` list ("Field dayOfWeek exists in OrderBy but is not defined
# in input Dimensions/Metrics list", measured live), so this cannot be silently
# corrected server-side the way hour/minute were without also injecting an
# extra column the caller never asked for — hence a note instead of a fix.
# Measured live: a 90-day eventCount-by-dayOfWeekName query sorted by
# dayOfWeekName came back Friday, Monday, Saturday, Sunday, Thursday, Tuesday,
# Wednesday — alphabetical, not calendar order. A "which day of week gets the
# most traffic" chart read off that order is silently wrong from the second bar.
def _order_by_targets_dimension(spec, dimension_name):
    """True if `spec` sorts by `dimension_name` anywhere order_bys can live.

    ga4_pivot.py rejects a top-level `order_bys` outright (PIVOT_KEYS) — sorting
    there lives per axis, in each `pivots[]` entry's own `order_bys`. Checking
    only spec["order_bys"] made the dayOfWeekName note below a permanent no-op
    for every pivot spec — confirmed live: a dayOfWeekName pivot axis sorted by
    itself came back Friday, Monday, Saturday, ... exactly like ga4_query.py,
    with no note. Shared by that check and the appVersion one below it.
    """
    if not isinstance(spec, dict):
        return False
    lists = [spec.get("order_bys")]
    pivots = spec.get("pivots")
    if isinstance(pivots, list):
        lists.extend(p.get("order_bys") for p in pivots if isinstance(p, dict))
    return any(
        isinstance(o, dict) and o.get("dimension") == dimension_name
        for order_bys in lists if isinstance(order_bys, list)
        for o in order_bys
    )


def add_weekday_name_sort_note(result, spec):
    """Warns when order_bys sorts by dayOfWeekName — GA4 sorts it alphabetically."""
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    if not _order_by_targets_dimension(spec, "dayOfWeekName"):
        return result
    return prepend_note(result, (
        "order_bys sorts by dayOfWeekName, which GA4 sorts alphabetically "
        "(Friday, Monday, Saturday, Sunday, Thursday, Tuesday, Wednesday), not "
        "in calendar order. Add `dayOfWeek` (0=Sunday..6=Saturday) to "
        "`dimensions` and sort by that instead, keeping dayOfWeekName only for "
        "the display label — GA4 rejects ordering by a dimension that isn't in "
        "the requested dimensions list."
    ))


# ---- sorting appVersion as plain text, not semver ----------------------------
#
# The same trap as dayOfWeekName, on a dimension almost every app property
# breaks out by. GA4 sorts appVersion lexically: "0.10.0" < "0.9.0" because
# '1' < '9' as characters, so a version-history or "which version introduced
# this" query silently comes back out of release order. Measured live,
# filtered to {"0.9.0", "0.9.1", "0.10.0", "0.11.0"} and sorted by appVersion:
# 0.10.0, 0.11.0, 0.9.0, 0.9.1 — every 0.1x release sorts before every 0.9x
# one. Unlike hour/minute, NUMERIC order type does NOT fix this — a multi-part
# version string isn't a single number, and requesting it anyway (measured
# live) produced a third, still-wrong order (0.10.0, 0.9.0, 0.9.1, 0.11.0),
# not semver and not the original lexical order either — so this is a note,
# not a server-side fix, same as dayOfWeekName. There is no GA4 dimension that
# carries a semver-comparable form of appVersion to substitute the way
# dayOfWeek substitutes for dayOfWeekName.
def add_appversion_sort_note(result, spec):
    """Warns when order_bys sorts by appVersion — GA4 sorts it as plain text."""
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    if not _order_by_targets_dimension(spec, "appVersion"):
        return result
    return prepend_note(result, (
        "order_bys sorts by appVersion, which GA4 sorts as plain text, not "
        "semver — a version with a two-digit part sorts before one with a "
        "one-digit part in the same position regardless of numeric value "
        "(measured live: 0.10.0 and 0.11.0 both sorted ahead of 0.9.0 and "
        "0.9.1). NUMERIC order type does not fix this (measured: it produces "
        "a third, still-wrong order — a version string isn't a single number). "
        "Do not trust this order for a version history or a \"which version "
        "introduced this\" answer; sort the returned rows yourself by parsing "
        "each version's dot-separated parts as integers."
    ))


def add_expression_ratio_note(result, spec):
    """Marks computed ratios non-additive, since their names cannot be judged."""
    if not isinstance(result, dict):
        return result
    headers = result.get("metric_headers")
    if not isinstance(headers, list):
        return result
    found = [n for n in expression_ratio_metrics(spec) if n in headers]
    if not found:
        return result
    # Merge rather than replace: shape_report_response may already have listed
    # metrics it recognised by name, and dropping those would trade one silent
    # summing error for another.
    existing = result.get("non_additive_metrics")
    merged = sorted(set(existing or []) | set(found))
    return prepend_note(
        {**result, "non_additive_metrics": merged},
        f"{', '.join(found)} is computed with a dividing expression, so it is a "
        "ratio: summing it across rows is meaningless no matter what it is named. "
        "For an overall figure, run the same expression again with no dimensions "
        "rather than combining these rows."
    )


# Every identifier token in an expression (operands are metric names; GA4
# expression metrics are arithmetic over metrics, so a bare identifier is a
# metric). Shared by P16 (revenue-operand extraction) and P19 (operand-overlap
# detection), so "what characters make a metric token" is defined once. Note
# this splits a custom metric name on its colon — "customEvent:totalRevenue"
# yields both "customEvent" and "totalRevenue" — so an expression over a
# custom metric whose tail happens to be a standard revenue name can report a
# false overlap with that standard metric. That costs at most one unnecessary
# warning (same heuristic family as P16); whether GA4 expressions even accept
# custom metrics was not observed either way.
_EXPRESSION_IDENTIFIERS = _re.compile(r"[A-Za-z][A-Za-z0-9_]*")


# An expression that references a REVENUE metric (totalRevenue, purchaseRevenue,
# itemRevenue, ...) is only actually computed by GA4 when that revenue metric is
# ALSO requested on its own. Otherwise GA4 returns the revenue metric's raw value
# under the expression's name — silently. Measured live: with a purchase filter and
# a deviceCategory breakdown, {"name":"aov","expression":"totalRevenue/eventCount"}
# came back as ~4.09 billion on mobile (that is totalRevenue itself), not the
# tens-of-thousands-of-won ratio; adding totalRevenue to `metrics` made the SAME
# compute correctly. The sort order followed the raw value too, so the whole answer
# was the numerator mislabeled. Non-revenue operands (eventCount, sessions) compute
# fine with no extra request (measured: eventCount/sessions alone was exact), so
# only revenue references are flagged.
#
# The detector keys off the "Revenue" suffix as a HEURISTIC for money metrics, and
# it is deliberately documented as not exhaustive: GA4 has money metrics that do not
# end in "Revenue" — itemRefundAmount, advertiserAdCost, averageRevenuePerUser — and
# custom ones named like customEvent:refundAmount, which this will NOT flag (the trap
# was not measured for those). When an expression uses such a metric, request it
# alongside the expression too. The suffix was still the right cutoff because every
# standard *revenue* metric observed shares it, the cost of a missed warning is a
# silent wrong answer, and the cost of a false positive is only one extra request.

def _revenue_operands(expression):
    """Revenue metric names referenced in an expression: identifier tokens
    ending in "Revenue" (the heuristic documented above). Tokenizes with the
    shared _EXPRESSION_IDENTIFIERS grammar rather than a second regex."""
    return [token for token in _EXPRESSION_IDENTIFIERS.findall(expression)
            if token.endswith("Revenue")]

# A bare alias — {"name": "tr", "expression": "totalRevenue"} with no operator —
# returns the operand's correct value: there is no ratio for GA4 to fail to compute,
# so warning there would be a false positive (a pure rename comes back right). Only
# an expression that actually combines operands (has an arithmetic operator) can hit
# the raw-operand trap. Mirrors how add_expression_ratio_note gates on division.
_ARITHMETIC_EXPRESSION = _re.compile(r"[+\-*/]")


def _revenue_operands_missing_from_request(spec):
    """{(expression metric name): sorted revenue operands it uses but that were not
    also requested as standalone metrics}. Only expressions present by name matter;
    an operand already in `metrics` (string or object form) computes correctly."""
    requested, expressions = _metric_requests(spec)
    problems = {}
    for name, expression in expressions.items():
        # A bare alias has no ratio to miscompute — skip it (see _ARITHMETIC_EXPRESSION).
        if not _ARITHMETIC_EXPRESSION.search(expression):
            continue
        missing = sorted({m for m in _revenue_operands(expression)
                          if m != name and m not in requested})
        if missing:
            problems[name] = missing
    return problems


def add_expression_revenue_note(result, spec):
    """Warns that a revenue-based ratio may be the raw numerator, not the ratio.

    Phrased as a strong warning rather than a verdict: the returned value can
    coincidentally look plausible, and asserting "this is wrong" would be a new
    confident error. The fix is unambiguous and cheap — request the revenue metric
    alongside the expression — so the note points straight at it and tells the
    reader how to recognise the trap (a 'ratio' that reads like a total).
    """
    if not isinstance(result, dict):
        return result
    headers = result.get("metric_headers")
    if not isinstance(headers, list):
        return result
    problems = {name: missing
                for name, missing in _revenue_operands_missing_from_request(spec).items()
                if name in headers}
    if not problems:
        return result
    parts = "; ".join(
        f"{name} uses {', '.join(missing)}" for name, missing in sorted(problems.items()))
    note = (
        f"Check the result before quoting it: {parts}, but that revenue metric was "
        "not requested on its own. GA4 frequently does NOT evaluate such an "
        "expression — it returns the revenue metric's raw value under the "
        "expression's name (measured: a 'totalRevenue/eventCount' average order "
        "value came back as totalRevenue itself, in the billions, not the "
        "tens-of-thousands ratio, and even sorted by that raw value). Add the "
        "revenue metric to `metrics` and re-query to be certain; a 'ratio' that "
        "reads like a large total is this trap. (This check auto-detects metrics "
        "ending in 'Revenue'; other money metrics in an expression — itemRefundAmount, "
        "advertiserAdCost, averageRevenuePerUser — are not flagged, so request them "
        "alongside the expression too.)"
    )
    return prepend_note(
        {**result, "expression_revenue_operands": problems}, note)


def _is_event_scope_revenue(name):
    """Whether a metric is an event-scope revenue metric — the kind that drifts
    under sampling+expression (measured live: totalRevenue ≈34.9→2.6 hundred-million
    and purchaseRevenue likewise, ~13x, with eventCount unchanged). Item-scope
    revenue does NOT drift (measured: itemRevenue was byte-identical with and without
    the expression on the same sampled query), and neither do count/dedup metrics
    (sessions, totalPurchasers, eventCount all unchanged). So the warning is scoped
    to revenue metrics whose name carries no "item" token — itemRevenue,
    grossItemRevenue and friends are excluded."""
    return name.endswith("Revenue") and "item" not in name.lower()


def add_expression_sampling_note(result, spec):
    """Warns when a SAMPLED response mixes an expression metric with a raw metric
    that the expression references.

    Measured live: with a customUser:user_grade breakdown (which GA4 samples),
    requesting {"name":"aov","expression":"totalRevenue/eventCount"} ALONGSIDE raw
    totalRevenue made totalRevenue come back ~13x smaller (≈2.6 vs ≈34.8
    hundred-million won) than when the expression was omitted — with eventCount
    unchanged, and deterministically so (same answer on repeat). The identical
    query on deviceCategory (which is NOT sampled) was perfectly consistent. So
    under sampling, asking for an expression and one of its operands together can
    pull the raw operand column onto the sampled footing, and that column silently
    stops being the true total. The generic sampling note ("estimates; don't trust
    SMALL gaps") does not cover a 13x discrepancy between two columns of the same
    response — a reader who trusts the raw column reports a number an order of
    magnitude off. Tell them to request the raw metric separately (no expression),
    or narrow the query so sampling does not trigger.
    """
    if not isinstance(result, dict):
        return result
    if not (result.get("metadata") or {}).get("sampling"):
        return result
    headers = result.get("metric_headers")
    if not isinstance(headers, list):
        return result
    requested, expressions = _metric_requests(spec)
    # A bare alias (no operator) returns the operand as-is by design, so it
    # can't hit the raw-operand trap — only computing expressions can
    # (_ARITHMETIC_EXPRESSION is shared with P16's bare-alias gate).
    expr_refs = {name: set(_EXPRESSION_IDENTIFIERS.findall(expression))
                 for name, expression in expressions.items()
                 if _ARITHMETIC_EXPRESSION.search(expression)}
    if not expr_refs:
        return result
    referenced = set().union(*expr_refs.values())
    # Raw metrics an expression also references — the columns whose value can shift
    # under sampling. Exclude the expression metrics' own names, restrict to
    # EVENT-SCOPE revenue metrics (measured live: totalRevenue and purchaseRevenue
    # shifted ~13x under sampling while itemRevenue and the count/dedup metrics were
    # byte-identical; see _is_event_scope_revenue), and — mirroring P16 — only
    # columns actually present in the response.
    overlap = sorted(m for m in ((referenced & requested) - set(expr_refs))
                     if _is_event_scope_revenue(m) and m in headers)
    if not overlap:
        return result
    # Name only the expressions that actually reference an overlapping operand, so
    # with several expressions the note doesn't imply they all use it.
    overlap_set = set(overlap)
    using = sorted(n for n, refs in expr_refs.items() if refs & overlap_set)
    note = (
        f"This response is sampled AND mixes a computed expression "
        f"({', '.join(using)}) with the raw metric(s) it uses "
        f"({', '.join(overlap)}). Measured live, under sampling that combination can "
        "make the raw column come back far smaller than its true total — the same "
        "query without the expression returned a roughly 13x larger revenue, with the "
        "event count unchanged — which appears to pull the raw value onto the sampled "
        f"footing. Do not quote {', '.join(overlap)} from THIS response: request it in "
        "a separate query with no expression, or narrow the period/dimension so "
        "sampling does not trigger."
    )
    return prepend_note(
        {**result, "expression_sampling_overlap": overlap}, note)


# ---- zero rows behind a filter ----------------------------------------------
#
# A filtered query that matches nothing returns row_count 0 with headers present
# and no error — a confident, wrong-looking-like-right zero. Measured live: the
# same property answers 0 rows for itemCategory = "Kpop & Kdrama" and 1 row for
# "Kpop &amp; Kdrama", because GA4 stores whatever the site's ecommerce code
# sent, entities and all. Nothing in the response distinguishes "this category
# earned nothing" from "your filter never matched", so the marketer gets told
# revenue is zero for a category that in fact sells.
#
# The existing empty-response note cannot cover this: it only fires when headers
# AND rows are both empty, which is the no-dimension shape. Here the headers are
# present.
#
# Deliberately phrased as a possibility, never as a verdict. Zero really is zero
# often enough that asserting "your filter is wrong" would just be a new
# confident error pointing the other way.

FILTER_KEYS = ("dimension_filter", "metric_filter")

EMPTY_FILTER_NOTE = (
    "Zero rows, and a filter was applied — so this is either a genuine zero or a "
    "filter that never matched. Before reporting it as zero, re-run without the "
    "filter and compare the value exactly as GA4 returns it: stored values keep "
    "whatever the app or site sent, including HTML entities (\"Tours &amp; Tickets\" "
    "where a person would write \"Tours & Tickets\", a web-side artifact — app "
    "clients don't produce this one, but casing and stray whitespace can differ on "
    "either), original casing, and stray whitespace."
)


def add_empty_filter_note(result, spec):
    """Adds a note when a filtered report came back with no rows.

    Returns a new dict; never mutates.

    This note outranks the *shaping* notes it was originally compared against
    (see below); it is not the topmost note overall, since the pipeline entries
    registered after `empty_filter` land above it. That was not the
    original design — the first version deferred to any existing note, reasoning
    that the others describe rows that exist and are therefore more specific.
    Measured against the live API, that reasoning was wrong in both directions.
    The non-additive note fires at zero rows too, where "don't sum these rows" is
    advice about rows that aren't there. And the empty-response note says the
    empty shape "usually means zero matching data rather than a broken request" —
    which, with a filter in play, actively reassures the reader in the wrong
    direction. Neither is worth suppressing the one message that is actionable
    here, so they are kept but demoted.
    """
    if not isinstance(result, dict):
        return result
    if result.get("row_count") != 0:
        return result
    if not isinstance(spec, dict) or not any(spec.get(k) for k in FILTER_KEYS):
        return result
    return prepend_note({**result}, EMPTY_FILTER_NOTE)


# ---- zero because it was never instrumented ---------------------------------
#
# "How much did we refund?" answered with "0" is the worst kind of wrong answer
# this project produces, because it is not an error and not even an implausible
# number. GA4 only records a refund if the site sends a `refund` event, so a
# property that never implemented refund tracking reports refundAmount = 0
# forever — indistinguishable from a shop that genuinely refunded nothing. The
# marketer hears "no refunds" and stops asking.
#
# ga-taxonomy already writes .ga4/collected_events.json: every event name the
# property has actually recorded, over a stated lookback window. That answers
# the question directly — if `refund` has never been seen in 365 days, the zero
# is a tracking gap, not a business result.
#
# The mapping below was checked against a live property rather than assembled
# from the docs alone: for all 22 entries the prediction held exactly — every
# metric whose backing event was missing measured 0, and every metric whose
# event was present measured non-zero. That is the whole basis for stating the
# cause rather than hedging.
#
# Only event-backed metrics are listed. shippingAmount, taxAmount and
# itemDiscountAmount also read 0 on that property, but they depend on
# *parameters inside* the purchase event, which collected_events.json cannot
# see. Guessing at those would put a confident wrong cause on the screen, which
# is the failure this whole note exists to prevent.
#
# One tuple, nine metrics: every purchase-backed metric is filled by the same
# family of events, so they all point at it.
_PURCHASE_EVENTS = ("purchase", "in_app_purchase",
                    "app_store_subscription_convert",
                    "app_store_subscription_renew")

EVENT_BACKED_METRICS = {
    "refundAmount": "refund",
    "itemRefundAmount": "refund",
    "promotionViews": "view_promotion",
    "itemsViewedInPromotion": "view_promotion",
    "promotionClicks": "select_promotion",
    "itemsClickedInPromotion": "select_promotion",
    "itemListViewEvents": "view_item_list",
    "itemsViewedInList": "view_item_list",
    "itemListClickEvents": "select_item",
    "itemsClickedInList": "select_item",
    "addToCarts": "add_to_cart",
    "itemsAddedToCart": "add_to_cart",
    "checkouts": "begin_checkout",
    "itemsCheckedOut": "begin_checkout",
    "itemViewEvents": "view_item",
    "itemsViewed": "view_item",
    # Web and app fill the whole purchase family from different events. GA4
    # counts a purchase for in_app_purchase and the two app_store_subscription_*
    # events as well as purchase — its own metric definitions say "purchase or
    # in-app purchase" for the purchaser metrics, and in_app_purchase carries an
    # items parameter like purchase does. Naming only `purchase` would send an
    # app marketer to instrument the wrong thing. The zero guard means the note
    # only fires when none of the four produced anything, so listing all four
    # costs no false negatives — it only makes the advice correct when it fires.
    "transactions": _PURCHASE_EVENTS,
    "ecommercePurchases": _PURCHASE_EVENTS,
    "purchaseRevenue": _PURCHASE_EVENTS,
    "grossPurchaseRevenue": _PURCHASE_EVENTS,
    "itemRevenue": _PURCHASE_EVENTS,
    "grossItemRevenue": _PURCHASE_EVENTS,
    "itemsPurchased": _PURCHASE_EVENTS,
    "totalPurchasers": _PURCHASE_EVENTS,
    # Verified live alongside grossPurchaseRevenue: both return real values on a
    # property that records purchases, so neither is a metric the API declines.
    "firstTimePurchasers": _PURCHASE_EVENTS,
}


def add_property_metadata(result, property_id, config=None):
    """Fills in currency/timezone from the saved property when the response omits them.

    Realtime responses carry no metadata block at all, so without this the
    currency is simply unknowable on that path — and an unlabelled revenue figure
    is the one thing this must never produce. ga-auth stores both at property
    selection (ga4_admin.py get-property), so the answer is already on disk.

    Only used when the saved config is for **this** property: run_cli accepts
    --property, so the config can easily describe a different one, and labelling
    a figure with another property's currency is worse than not labelling it.
    Values already present in the response win — those came from the report
    itself and are current, whereas the config is a snapshot from selection time.
    """
    if not isinstance(result, dict):
        return result
    if config is None:                      # direct callers (tests) may omit it
        from ga4_common import load_config
        config = load_config() or {}
    cfg = config
    if str(cfg.get("property_id")) != str(property_id):
        return result
    known = {k: cfg[k] for k in ("currency_code", "time_zone")
             if cfg.get(k) and k not in result.get("metadata", {})}
    if not known:
        return result
    return {**result, "metadata": {**result.get("metadata", {}), **known}}


def read_collected_events(property_id):
    """(event names, lookback days, snapshot age in days) from ga-taxonomy's
    collected_events.json.

    Returns (None, None, None) whenever the answer would be a guess: no file,
    corrupt file, or a file describing a *different* property. The property check
    matters — .ga4 can be pointed elsewhere with GA4_DIR, and reporting "this
    event was never collected" from another property's inventory would be a
    confident lie.
    """
    import json
    from ga4_common import ga4_dir

    try:
        data = json.loads((ga4_dir() / "collected_events.json").read_text(encoding="utf-8"))
        if str(data.get("property_id")) != str(property_id):
            return None, None, None
        names = {e["name"] for e in data["events"] if isinstance(e, dict) and "name" in e}
    except (OSError, ValueError, KeyError, TypeError):
        return None, None, None
    return (names or None), data.get("days"), _snapshot_age_days(data.get("fetched_at"))


def _snapshot_age_days(fetched_at):
    """Days since the inventory was collected, or None if it cannot be told."""
    from datetime import datetime, timezone

    if not isinstance(fetched_at, str):
        return None
    try:
        when = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
    except ValueError:
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - when).days


# Past this, the inventory is treated as a snapshot rather than as current fact.
# The note it feeds says the event has never been recorded "and never will until
# the app or site starts sending them" — present tense, and stated with confidence. On a
# six-month-old snapshot that sentence is a confident lie about a property that
# may have added the tracking last month, which is precisely the class of error
# this module exists to prevent. Matches ga-taxonomy's own staleness threshold.
STALE_INVENTORY_DAYS = 30


def _spec_names(value):
    """Names out of a spec's dimensions/metrics list (str entries or {"name": ...}).

    One rule, one place: this shape was open-coded in three spots, so adding a
    third accepted notation would have meant finding all three.
    """
    out = []
    for item in value if isinstance(value, (list, tuple)) else []:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict) and isinstance(item.get("name"), str):
            out.append(item["name"])
    return out


def _metric_names(spec):
    return _spec_names(spec.get("metrics") if isinstance(spec, dict) else None)


def _is_all_zero(result, metric):
    """True when the report carries no non-zero value for this metric."""
    rows = result.get("rows")
    if not isinstance(rows, list):
        return False
    for row in rows:
        if not isinstance(row, dict) or metric not in row:
            continue
        try:
            if float(row[metric]) != 0:
                return False
        except (TypeError, ValueError):
            return False        # unparseable: say nothing rather than guess
    return True


def _event_tuple(value):
    """Normalises an EVENT_BACKED_METRICS value to a tuple of event names."""
    return (value,) if isinstance(value, str) else tuple(value)


def add_uninstrumented_metric_note(result, spec, property_id):
    """Explains a zero that comes from missing tracking rather than no activity."""
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    wanted = {m: EVENT_BACKED_METRICS[m] for m in _metric_names(spec)
              if m in EVENT_BACKED_METRICS}
    if not wanted:
        return result
    collected, days, age = read_collected_events(property_id)
    if not collected:
        return result
    # A value may be one event name or a tuple of them (a metric several events
    # can fill). Only when *none* of them was ever collected is the zero
    # explained by missing tracking.
    missing = {m: _event_tuple(ev) for m, ev in wanted.items()
               if not (set(_event_tuple(ev)) & collected) and _is_all_zero(result, m)}
    if not missing:
        return result

    pairs = ", ".join(
        f"{m} (needs the {evs[0]} event)" if len(evs) == 1
        else f"{m} (needs one of: {', '.join(evs)})"
        for m, evs in sorted(missing.items()))
    window = f"the last {days} days" if days else "the collected history"
    # A stale inventory still points at the right suspicion — it just cannot
    # carry the certainty. Hedging beats both alternatives: dropping the note
    # leaves the zero to be read as a business result, and keeping the confident
    # wording asserts a present-tense fact from a months-old snapshot.
    if age is not None and age > STALE_INVENTORY_DAYS:
        note = (
            f"This zero may mean not tracked rather than no activity: {pairs}. "
            f"The event inventory on file is {age} days old and showed no such events "
            f"over {window}, but tracking added since then would not appear in it. "
            "Refresh it with the ga-taxonomy skill before calling this a tracking "
            "gap — and do not report it as a business result until you have."
        )
    else:
        note = (
            f"Zero here means not tracked, not zero activity: {pairs}. "
            f"Those events have never been recorded on this property over {window}, "
            "so GA4 has nothing to report for these metrics and never will until the "
            "app or site starts sending them. Say this is a tracking gap — reporting "
            "it as a business result (\"no refunds\", \"no promotion views\") would "
            "be wrong."
        )
    # Always a list, never a bare string: a metric can be filled by several
    # events (a purchase on app arrives as in_app_purchase), and a value that is
    # sometimes a string and sometimes a list is the kind of shape a reader gets
    # wrong once and then stops trusting.
    return prepend_note(
        {**result, "uninstrumented_metrics": {m: list(evs) for m, evs in sorted(missing.items())}},
        note)


# ---- purchase revenue with zero purchases: subscription apps ----------------
#
# GA4 counts app-store subscription events (app_store_subscription_*) into
# purchase revenue and into transactions, but not into the purchase-count or
# purchaser metrics. Measured on a live app-only property: 196
# app_store_subscription_renew events produced non-zero purchaseRevenue and
# real transactions, while ecommercePurchases, totalPurchasers and
# firstTimePurchasers all read 0. A report that shows both sides of that split
# — revenue beside the purchase counts — otherwise reads as broken data
# ("real revenue, 0 purchases"), and an average-order-value expression
# (purchaseRevenue/ecommercePurchases) comes back 0, which reads as "orders are
# free". The response itself proves the split: purchase/in_app_purchase would
# have raised the counts, so non-zero revenue beside all-zero counts can only
# come from the subscription events.
_SUBSCRIPTION_REVENUE_METRICS = ("purchaseRevenue", "grossPurchaseRevenue")
_SUBSCRIPTION_COUNT_METRICS = ("ecommercePurchases", "totalPurchasers",
                               "firstTimePurchasers", "itemsPurchased")


def add_subscription_revenue_note(result, spec):
    """Explains purchase revenue that sits beside all-zero purchase counts."""
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    requested = set(_metric_names(spec))
    revenue = requested & set(_SUBSCRIPTION_REVENUE_METRICS)
    counts = requested & set(_SUBSCRIPTION_COUNT_METRICS)
    if not revenue or not counts:
        return result            # the paradox is only visible with both sides
    if any(not _is_all_zero(result, m) for m in counts):
        return result            # real purchases: the zeros are not the story
    flagged = sorted(m for m in revenue if not _is_all_zero(result, m))
    if not flagged:
        return result            # no revenue beside the zeros: nothing to explain
    note = (
        "purchase revenue is non-zero while every requested purchase-count/purchaser "
        f"metric ({', '.join(sorted(counts))}) is 0: on this property the revenue comes "
        "from app-store subscription events (app_store_subscription_*), which GA4 "
        "counts into purchase revenue and into transactions but not into the "
        "purchase-count or purchaser metrics. Read the revenue as recurring "
        "subscription revenue, not one-off purchases — and do not divide it by the "
        "purchase count to get an average order value: the count is 0 by design, so "
        "such a ratio comes back 0 and would read as zero-priced orders."
    )
    return prepend_note({**result, "subscription_revenue": flagged}, note)


# ---- dimensions GA4 never received a value for -------------------------------
#
# GA4 fills a dimension it got no value for with the literal string "(not set)"
# — a normal-looking row that sorts and ranks like any other. Measured on a live
# property: "top coupons by revenue" put `(not set)` first at 87% of all
# revenue, which simply means "no coupon", and `shippingTier` came back 100%
# unset across every purchase. Reporting either as a finding ("our best coupon
# is (not set)", "most orders use the (not set) shipping tier") is nonsense the
# marketer has no way to catch.
#
# A fully unset dimension is the parameter-level twin of an uninstrumented
# metric: the purchase event fires, but the site never attaches that parameter.
# collected_events.json cannot see inside events, which is why the metric-level
# check deliberately skips parameter-backed metrics — but the response itself
# gives it away when no row anywhere carries a value.
#
# Deliberately NOT computed: how large a share "(not set)" holds. Getting that
# means summing rows, which is exactly the mistake _add_non_additive_note exists
# to prevent — correct for revenue, wrong for sessions or users. Report presence
# and let the reader run a proper total if they need the split.
UNSET_DIMENSION_VALUES = frozenset({"(not set)", "(not provided)", ""})

# ---- a fully-unset dimension that simply doesn't apply to this property's streams --
#
# SKILL.md already tells the reader, in prose, to check the platform before
# calling a fully-unset dimension a tracking gap — but the note text below used
# to assert one cause unconditionally: "the site is not attaching the
# parameter." For a dimension that cannot carry a value on this property's
# stream type at all, that is simply the wrong diagnosis, stated with the same
# confidence as a real gap. Measured live on an app-only (iOS+Android)
# property, both by name-pattern spot checks and by sweeping all 375
# standard dimensions ga4_metadata.py reports for it: the page family,
# browser/browserVersion, and every GA4 Enhanced Measurement dimension
# (outbound click, file download, video engagement, scroll) came back 100%
# "(not set)"/empty while appVersion — an app-stream dimension — was fully
# populated. Enhanced Measurement is a web-data-stream-only GA4 feature
# (configured per stream in GA4 Admin, no app-stream equivalent exists), so
# that whole family is as confident a web-only signal as the page family.
#
# The full sweep also turned up dimensions that were 100% unset for reasons
# that are NOT platform exclusivity, and are deliberately left off this
# list: screenResolution (a device property that could plausibly exist for
# an app too — the emptiness might be this app's SDK not sending it, the
# same ambiguity this check exists to resolve, not create), searchTerm and
# contentGroup/contentId/contentType (require manual instrumentation on
# either platform, so emptiness here just means this app doesn't use site
# search or content grouping — a real tracking gap, not a stream mismatch),
# and roughly 200 ad-platform dimensions (googleAds*/sa360*/dv360*/cm360*)
# that are empty because this property has no ad-platform integration
# linked, unrelated to which stream type it has.
#
# There is no "screenName" or "osVersion" dimension at all — GA4 rejects
# both with 400 — so the app side of this list is deliberately just the
# one confirmed member; guessing more would repeat the mistake this fix
# corrects. config.json's `platforms` (ga-auth) is what makes the call: a
# web-stream dimension is expected-empty whenever no platform in the list is
# "web", and appVersion is expected-empty whenever every platform is "web".
# On a mixed property (both present) nothing here is skipped — a dimension
# still 100% unset across the web rows too is not explained by platform alone.
_WEB_STREAM_DIMENSIONS = {
    "pagePath", "pagePathPlusQueryString", "pageLocation", "pageTitle",
    "pageReferrer", "hostName", "landingPage", "landingPagePlusQueryString",
    "fullPageUrl", "browser", "browserVersion",
    # The rest back GA4's web-only "Enhanced Measurement" events — a feature
    # configured per web data stream in GA4 Admin that has no app-stream
    # counterpart at all (apps use separate Firebase-SDK-level tracking).
    # Swept every standard dimension this app-only property exposes (375,
    # via ga4_metadata.py) and confirmed each of these families 100% empty:
    "linkUrl",                                    # outbound click (link_url)
    "linkText", "linkClasses", "linkId", "linkDomain", "outbound",
    "fileExtension", "fileName",                  # file download
    "videoUrl", "videoTitle", "videoProvider",     # video engagement
    "percentScrolled",                            # scroll depth
}
_APP_STREAM_DIMENSIONS = {"appVersion"}

# The subset of the above that GA4 actually offers a cross-stream substitute
# for. The unified* family is page/screen only — unifiedScreenName,
# unifiedScreenClass, unifiedPagePathScreen. There is no unified browser,
# link, video, file or scroll dimension, and none for appVersion; telling the
# reader to "use the unified* family" for those points at nothing.
_UNIFIED_ALTERNATIVE_DIMENSIONS = {
    "pagePath", "pagePathPlusQueryString", "pageLocation", "pageTitle",
    "landingPage", "landingPagePlusQueryString", "fullPageUrl",
}

# The sentinel ga-auth stores for a data stream whose type it could not
# classify (ga4_admin.py's UNKNOWN_PLATFORM). Duplicated as a literal rather
# than imported: ga-use must not import from a sibling skill, since the four
# skills are installed independently and only communicate through .ga4 files.
# If this string ever changes in ga-auth, _unavailable_streams silently starts
# applying platform judgements to unclassified properties again — the test
# test_unknown_platform_matches_ga_auths_sentinel pins the two together.
UNKNOWN_PLATFORM = "unknown"

# scrolledUsers is the metric-side twin of the dimension sweep above: it
# counts users who fired GA4's web-only "scroll" Enhanced Measurement event,
# so on a property with no web stream it can never be anything but 0 — not
# because scroll tracking was left uninstrumented (nothing to instrument;
# the app SDK has no such event to send), but because the stream type this
# metric depends on doesn't exist here. Measured live on the same app-only
# property: scrolledUsers read a bare 0 with activeUsers=884 in the same
# response and got NO explanation at all — not `uninstrumented_metrics`
# (scrolledUsers isn't in EVENT_BACKED_METRICS, so that check never even
# considered it) and not a platform note (metrics never went through the
# dimension-only platform check above). Scanned all 86 non-custom metrics
# this property exposes for a web-only Enhanced Measurement counterpart to
# the other three families (outbound click, file download, video) and found
# none — scrolledUsers appears to be the only metric of this shape.
_WEB_STREAM_METRICS = {"scrolledUsers"}
_APP_STREAM_METRICS = set()


def _unavailable_streams(platforms):
    """(no_web, no_app) for this property's configured streams.

    config.json is meant to hold a list here, but it is a hand-editable local
    file — a bare string ("web" instead of ["web"]) would otherwise iterate
    character by character ({'w','e','b'}), silently misjudging every
    platform. Guessing at a malformed value is worse than staying silent.

    An "unknown" entry disables both judgements. ga-auth writes that sentinel
    for a stream type it does not recognise (ga4_admin.py's UNKNOWN_PLATFORM,
    where an unrecognised type "becomes 'unknown' rather than being dropped"),
    so the list is not a complete answer — the unclassified stream could be
    the very web stream whose absence would otherwise be inferred here. Read
    literally, {"unknown"} has no "web" in it and the naive check called the
    property app-only, then told the reader a genuine tracking gap was
    "expected, not a tracking gap" with full confidence. SKILL.md states the
    rule this restores, in as many words: "Do not read a missing `web` as
    'app-only' while `unknown` is present." Same outcome as an absent
    platforms list: say nothing rather than apply a judgement that was never
    earned.
    """
    if not platforms or not isinstance(platforms, (list, tuple, set)):
        return False, False
    normalized = {str(p).strip().lower() for p in platforms}
    if UNKNOWN_PLATFORM in normalized:
        return False, False
    return "web" not in normalized, not bool(normalized - {"web"})


def _describe_platforms(platforms):
    """The platforms list as note-safe display text.

    `', '.join(platforms)` raises TypeError on any non-string entry, and a
    hand-edited config.json can hold one. decorate_result swallows a raising
    producer with `except Exception: continue`, so that TypeError silently
    deleted the ENTIRE note — including the genuine-tracking-gap half that has
    nothing to do with platforms. _unavailable_streams already str()s every
    entry before comparing; this closes the same hole on the display side.
    """
    return ", ".join(str(p) for p in platforms)


def _platform_mismatched(names, platforms, web_set, app_set):
    no_web, no_app = _unavailable_streams(platforms)
    out = set()
    if no_web:
        out |= web_set & set(names)
    if no_app:
        out |= app_set & set(names)
    return out


def _platform_mismatched_dimensions(dims, platforms):
    """Which of `dims` cannot carry a value on this property's configured streams."""
    return _platform_mismatched(dims, platforms, _WEB_STREAM_DIMENSIONS, _APP_STREAM_DIMENSIONS)


def _platform_mismatched_metrics(metrics, platforms):
    """Which of `metrics` can only ever read 0 on this property's configured streams."""
    return _platform_mismatched(metrics, platforms, _WEB_STREAM_METRICS, _APP_STREAM_METRICS)


def add_platform_mismatched_metric_note(result, spec, platforms):
    """Explains a metric reading 0 because its backing stream type doesn't
    exist here — distinct from both add_uninstrumented_metric_note (a real
    tracking gap that adding the event would fix) and a genuine business
    zero. See _WEB_STREAM_METRICS for why this can't be guessed without
    `platforms` on file.
    """
    if not isinstance(result, dict) or not isinstance(spec, dict):
        return result
    candidates = _platform_mismatched_metrics(_metric_names(spec), platforms)
    flagged = sorted(m for m in candidates if _is_all_zero(result, m))
    if not flagged:
        return result
    # Which side is missing decides the parenthetical. _APP_STREAM_METRICS is
    # empty today, so the web sentence is what always renders — but hardcoding
    # it means the first app-side member added would silently describe itself
    # as "web-only Enhanced Measurement", which is the class of confidently
    # wrong sentence this whole check exists to remove. The dimension-side
    # note already branches; this now matches it.
    web_flagged = [m for m in flagged if m in _WEB_STREAM_METRICS]
    cause = (
        "it's part of a web-only GA4 Enhanced Measurement event with no "
        "app-stream counterpart" if web_flagged else
        "it depends on an app-stream signal this property has no stream for"
    )
    return prepend_note({**result, "platform_mismatched_metrics": flagged}, (
        f"{', '.join(flagged)} read 0, but not because it was never tracked: "
        f"this property's streams ({_describe_platforms(platforms)}) don't "
        f"include the stream type this metric depends on ({cause}), so the "
        "value can never be anything else here. Do not report it as a "
        "tracking gap or as a business result."
    ))


def find_unset_dimensions(result, exclude_indexes=()):
    """(fully unset dimensions, partly unset dimensions, {dim: (unset, total)}).

    The row counts come along because "some rows are unset" spans two very
    different situations, both measured on the same property: orderCoupon had 2
    unset rows out of 53 and those two held most of the revenue, while
    pagePathPlusQueryString had a single unset row out of tens of thousands and was immaterial. Suppressing
    the second with a threshold would eventually suppress the first, since row
    share and value share are not the same thing — and computing value share
    here would mean summing rows, which is wrong for the non-additive metrics
    this module already warns about. So report the counts and let the reader
    decide whether to look.

    exclude_indexes names rows to skip before counting. A funnel breakdown mixes
    GA4 aggregate rows (RESERVED_TOTAL / RESERVED_(other)) in among the real
    breakdown values, and those are not categories; counting them would dilute a
    fully-unset dimension into a "partly unset" one. Measured on a live property:
    a payment_type funnel breakdown whose real rows were 100% "(not set)" read as
    only 50% unset once its two RESERVED_TOTAL rows were counted, so the tracking
    gap would have been reported as an ordinary breakdown. runReport has no such
    rows and passes nothing here.
    """
    headers = result.get("dimension_headers")
    rows = result.get("rows")
    if not isinstance(headers, list) or not isinstance(rows, list) or not rows:
        return [], [], {}
    excluded = set(exclude_indexes or ())
    full, partial, counts = [], [], {}
    for dim in headers:
        seen = [row.get(dim) for i, row in enumerate(rows)
                if i not in excluded and isinstance(row, dict) and dim in row]
        if not seen:
            continue
        unset = [v for v in seen if v in UNSET_DIMENSION_VALUES]
        if not unset:
            continue
        counts[dim] = (len(unset), len(seen))
        (full if len(unset) == len(seen) else partial).append(dim)
    return full, partial, counts


def add_unset_dimension_note(result, exclude_indexes=(), platforms=None):
    """Flags "(not set)" rows so they are not read as a category.

    `platforms` (config.json's list, e.g. ["iOS", "Android"] or ["web"]) lets
    a fully-unset dimension that simply doesn't exist on this property's
    stream type be described correctly instead of as a tracking gap — see
    _platform_mismatched_dimensions. Two call sites pass it: the top-level
    NOTE_PIPELINE entry (via decorate_result's cfg) and shape_funnel_response's
    per-sub-report calls, which get it from run_funnel_report's own `platforms`
    kwarg (ga4_funnel.py's main() loads config separately for this, since
    run_cli calls the runner before it loads cfg for decorate_result).
    """
    if not isinstance(result, dict):
        return result
    full, partial, counts = find_unset_dimensions(result, exclude_indexes)
    if not full and not partial:
        return result
    mismatched = sorted(_platform_mismatched_dimensions(full, platforms))
    genuine_full = [d for d in full if d not in mismatched]
    parts = []
    if mismatched:
        # The unified* remedy only exists for the page/screen family. GA4 has
        # no unified browser, link, video, file or scroll dimension, and none
        # for appVersion either — offering it for those sent the reader after
        # a dimension that does not exist, which is its own confidently wrong
        # answer. SKILL.md scopes the advice correctly; this now matches it.
        remedy = (
            " Use the `unified*` family (unifiedScreenName, unifiedScreenClass, "
            "unifiedPagePathScreen) for a view that works across stream types "
            "instead of reporting this as missing instrumentation."
            if any(d in _UNIFIED_ALTERNATIVE_DIMENSIONS for d in mismatched) else
            " There is no cross-stream equivalent for this one — report that the "
            "dimension does not apply to this property rather than substituting "
            "another dimension for it."
        )
        parts.append(
            f"{', '.join(mismatched)} read \"(not set)\" on every row, but on this "
            f"property (streams: {_describe_platforms(platforms)}) that is expected, "
            "not a tracking gap — the dimension belongs to a stream type this "
            "property doesn't have." + remedy
        )
    if genuine_full:
        parts.append(
            f"No row has a value for {', '.join(genuine_full)} — GA4 received nothing "
            "for this on any of these rows, so the breakdown carries no information. "
            "The event is firing but this parameter is never attached; "
            "report it as a tracking gap, not as a result."
        )
    if partial:
        listed = ", ".join(f"{dim} ({counts[dim][0]} of {counts[dim][1]} rows)"
                           for dim in partial)
        parts.append(
            f"Unset rows (empty, \"(not set)\", or \"(not provided)\") appear in "
            f"{listed}. That is not a category — it means GA4 got no value for those "
            "rows (e.g. an unset coupon means \"no coupon was used\"). Never present "
            "it as the top item; exclude it or name it separately. Check the row "
            "counts before deciding it is negligible: a handful of unset rows can "
            "still hold most of the metric's total."
        )
    note = " ".join(parts)
    unset_info = {
        "fully_unset": full,
        "partly_unset": partial,
        "row_counts": {d: {"unset": u, "total": t} for d, (u, t) in counts.items()},
    }
    if mismatched:
        unset_info["platform_mismatched"] = mismatched
    return prepend_note({**result, "unset_dimensions": unset_info}, note)


# ---- days GA4 dropped from a daily breakdown --------------------------------
#
# GA4 omits a row entirely when every requested metric is zero for it. In a
# daily revenue trend that means a day with no sales simply is not there.
# Measured on a live property: a 7-day purchaseRevenue-by-date query returned
# six rows, silently missing one — a day with over a thousand sessions and no orders.
#
# Nothing about the response looks wrong, and the damage is arithmetic: a daily
# average taken over the returned rows divides by 6 instead of 7 and comes out
# ~17% high. A trend line joins the days on either side and hides the zero.
#
# Gaps are found from the returned dates themselves rather than by resolving the
# requested range. The spec's dates are usually relative ("6daysAgo", "today")
# and resolve in the *property's* timezone, which this process does not know —
# working them out here would trade a real detection for an off-by-one-day claim
# near midnight. The tradeoff is that a missing day at either end of the range is
# invisible; that limitation is documented rather than papered over.
_YYYYMMDD = _re.compile(r"^\d{8}$")


_YYYYMM = _re.compile(r"^\d{6}$")


def _missing_yearmonths(rows):
    """yearMonth (YYYYMM) values absent between the first and last present.

    Same reasoning as the `date` case below, one level coarser: GA4 drops a
    yearMonth row the same way it drops a date row when every metric is zero
    for it. Measured live: a 12-month purchaseRevenue-by-yearMonth query
    returned 4 rows (8 months had zero subscription revenue); averaging over
    those 4 alone overstates the monthly average by roughly 3x. Returns None
    (not []) on an unparseable value, matching find_missing_dates's "say
    nothing rather than guess" — callers must check for that explicitly.
    """
    seen = set()
    for row in rows:
        value = row.get("yearMonth") if isinstance(row, dict) else None
        if isinstance(value, str) and _YYYYMM.match(value):
            y, m = int(value[:4]), int(value[4:6])
            if not 1 <= m <= 12:
                return None
            seen.add((y, m))
    if len(seen) < 2:
        return []
    start, last = min(seen), max(seen)
    cur, missing = start, []
    while cur < last:
        cur = (cur[0] + 1, 1) if cur[1] == 12 else (cur[0], cur[1] + 1)
        if cur not in seen and cur != last:
            missing.append(f"{cur[0]:04d}{cur[1]:02d}")
    return missing


def find_missing_dates(result):
    """Dates (or, for a `yearMonth` breakdown, months) absent between the
    first and last present, as YYYYMMDD or YYYYMM respectively.

    Nothing is reported for a truncated response. A gap there is the `limit`
    cutting rows off, not GA4 dropping an all-zero day — and calling it a real
    zero would tell the marketer a day had no sales when it may have had the
    month's best. Caught by running this against a limit:5 query, where it
    confidently listed five days that simply had not been returned.

    The same reasoning covers a response GA4 collapsed into "(other)" or answered
    from a sample: in both, a date can be absent because the response is
    incomplete, not because the day was zero. _add_response_metadata has already
    detected and recorded both, so the check is a read rather than new work.
    `date` is low-cardinality so collapse is rare — but the note asserts "these
    are days with a real zero, not missing data", and that sentence has to be
    earned every time it is said. The same holds for `yearMonth`.
    """
    from datetime import date, timedelta

    headers = result.get("dimension_headers")
    rows = result.get("rows")
    if result.get("truncated"):
        return []
    meta = result.get("metadata")
    if isinstance(meta, dict) and (meta.get("data_loss_from_other_row")
                                   or meta.get("sampling")
                                   or meta.get("subject_to_thresholding")):
        return []
    if not isinstance(headers, list):
        return []
    has_date = "date" in headers
    has_yearmonth = "yearMonth" in headers
    if not has_date and not has_yearmonth:
        return []
    # With 2+ date ranges GA4 attaches a `dateRange` dimension and returns the
    # full date x range cross product, filling 0 outside each range. The dates
    # then present span the UNION of all ranges, so a day sitting in the gap
    # between two disjoint ranges (or otherwise outside them) is absent from
    # min..max yet was never inside any requested range — flagging it as "a real
    # zero, count it in" is false. Confirmed live: ranges 20-22 and 16-18 flagged
    # the 19th, which belongs to neither. Per-range grouping can't rescue this:
    # the zero-filled cross rows put every union date into every range's group,
    # so each group shows the same phantom gap. add_period_comparison_notes (the
    # cross-product warning) already gives the right guidance for this shape, so
    # say nothing here rather than assert a zero that isn't one. Applies equally
    # to yearMonth — GA4 attaches the same dateRange cross product to it.
    if "dateRange" in headers:
        return []
    if not isinstance(rows, list) or len(rows) < 2:
        return []
    if has_date:
        seen = set()
        for row in rows:
            value = row.get("date") if isinstance(row, dict) else None
            if isinstance(value, str) and _YYYYMMDD.match(value):
                try:
                    seen.add(date(int(value[:4]), int(value[4:6]), int(value[6:])))
                except ValueError:
                    return []          # unparseable: say nothing rather than guess
        if len(seen) < 2:
            return []
        day, last, missing = min(seen), max(seen), []
        while day < last:
            day += timedelta(days=1)
            if day not in seen and day != last:
                missing.append(day.strftime("%Y%m%d"))
        return missing
    return _missing_yearmonths(rows) or []


def add_missing_date_note(result):
    """Names the days (or months, for a yearMonth breakdown) GA4 dropped, so
    an average is not taken over the gaps."""
    if not isinstance(result, dict):
        return result
    missing = find_missing_dates(result)
    if not missing:
        return result
    # 8-digit values (date) vs 6-digit (yearMonth) — same list shape, different
    # unit word in the note. find_missing_dates never mixes the two formats in
    # one call, so checking the first entry is enough.
    unit = "day" if len(missing[0]) == 8 else "month"
    shown = ", ".join(missing[:5]) + (f" and {len(missing) - 5} more" if len(missing) > 5 else "")
    note = (
        f"{len(missing)} {unit}(s) inside this range have no row at all: {shown}. "
        "GA4 drops a row when every requested metric is zero for it, so these are "
        f"{unit}s with a real zero, not missing data. Count them in: an average over "
        "the returned rows alone divides by too few and comes out high, and "
        "a trend that joins the surrounding rows hides the zero entirely."
    )
    return prepend_note({**result, "missing_dates": missing}, note)


# ---- the same gap, one axis over: a TRENDED funnel's per-step daily trend ----
#
# A TRENDED funnel_visualization breaks rows out by funnelStepName x date. GA4
# drops a row the same way it does for a plain runReport — zero users reaching
# a step on a given day means no row for that (step, date) pair — so the same
# "count the gap in, don't silently average over it" risk applies. Measured
# live on an app-only property: a 2-step 14-day TRENDED funnel had step 1
# present on 8 of 14 days and step 2 on fewer still, with no note at all.
#
# find_missing_dates can't be reused directly on the sub-report as a whole: it
# assumes one homogeneous date axis, but a TRENDED sub mixes multiple steps'
# dates in the same rows list. Pooling them before looking for gaps would
# misdiagnose a date genuinely missing from one step's trend as present
# (borrowed from a sibling step that did have data that day) or the reverse.
# So: group by funnelStepName first, then run the identical single-axis
# detector per group.
#
# "Identical" has to mean identical. The first version handed the detector a
# freshly built {"dimension_headers": ["date"], "rows": step_rows}, which threw
# away every key find_missing_dates refuses on — dateRange, truncated, and
# metadata — so the per-step path asserted "real zeros, not missing data"
# in exactly the three situations the single-axis path documents as unsafe.
# Reproduced on a 2-range TRENDED funnel: a date sitting in the gap BETWEEN
# the two ranges (never inside either) was named as a real zero, the same
# phantom the detector's own comment says it measured live and refuses to
# claim. So the synthetic result now carries those keys through, and the
# guards do their own refusing. Only funnelStepName is dropped from the
# headers, because grouping by it is the entire point.
#
# Not attempted: grouping by (funnelStepName, dateRange) to keep per-range
# detection alive instead of refusing outright. That would be strictly more
# informative IF the funnel omits rows per range the way it omits them per
# step — but whether GA4 zero-fills or omits across a funnel's dateRange axis
# was never measured, and inventing the answer is what this fix is undoing.
# Refusing loses information; guessing states a wrong number as fact.
def find_missing_dates_by_step(sub):
    """Per-funnelStepName date gaps in a TRENDED funnel_visualization sub-report.

    Returns {step_name: [missing YYYYMMDD, ...]}, only for steps with a gap.
    """
    if not isinstance(sub, dict):
        return {}
    headers = sub.get("dimension_headers")
    rows = sub.get("rows")
    if not isinstance(headers, list) or "date" not in headers or "funnelStepName" not in headers:
        return {}
    if not isinstance(rows, list):
        return {}
    # Everything find_missing_dates reads, minus the axis being grouped on.
    carried = {
        "dimension_headers": [h for h in headers if h != "funnelStepName"],
        "truncated": sub.get("truncated"),
        "metadata": sub.get("metadata"),
    }
    by_step = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        step = row.get("funnelStepName")
        if step is None:
            continue
        by_step.setdefault(step, []).append(row)
    result = {}
    for step, step_rows in by_step.items():
        gaps = find_missing_dates({**carried, "rows": step_rows})
        if gaps:
            result[step] = gaps
    return result


def add_missing_date_note_by_step(sub):
    """Names per-step date gaps in a TRENDED funnel_visualization sub-report."""
    if not isinstance(sub, dict):
        return sub
    missing = find_missing_dates_by_step(sub)
    if not missing:
        return sub
    parts = []
    for step, gaps in missing.items():
        shown = ", ".join(gaps[:5]) + (f" and {len(gaps) - 5} more" if len(gaps) > 5 else "")
        parts.append(f"\"{step}\" is missing {len(gaps)} day(s) ({shown})")
    note = (
        "In funnel_visualization, " + "; ".join(parts) + " — GA4 drops a day's row "
        "for a step when zero users reached it that day, so these are real zeros, "
        "not missing data. Count them in when averaging or charting the daily "
        "trend; do not treat the gap as data that failed to come back."
    )
    return prepend_note({**sub, "missing_dates_by_step": missing}, note)


# GA4's own standard reports end their default range at yesterday, and for the
# same reason this module warns about elsewhere: data processing runs 24-48
# hours behind, so a range ending at `today` reports a partial day as if it were
# a whole one. Owned here rather than restated in each report script — the three
# copies carried an identical six-line comment, and a default-period policy that
# lives in three files gets changed in two.
DEFAULT_RANGE = {"start_date": "7daysAgo", "end_date": "yesterday"}


# ---- note pipeline -----------------------------------------------------------
#
# The order below IS the priority rule. It used to live in a prose comment above
# run_cli that enumerated the producers and stated which outranked which — and
# that comment went stale twice, at one point describing eight producers when
# there were fourteen. Worse, the comment and the code disagreed: it declared
# that the empty-filter note "goes FIRST when another note is already present",
# while run_cli applied that helper first, which — because prepend_note puts the
# newest note at the top — buried it under every later note. A rule that only a
# comment enforces is a rule that drifts away from the code it describes.
#
# Read this list bottom-up to get the note order a marketer sees: the LAST entry
# applied ends up at the TOP. Entries are therefore listed in ascending priority.
#
# The ranking principle: a note that changes what the number *means* outranks a
# note about how to *read* a number that is real.
#   - uninstrumented metric -> the figure is not a measurement at all
#   - empty filter          -> this zero may be an artifact of the filter
#   - missing dates / unset -> the rows present are real but incomplete
#   - ratio / period shape  -> the number is real, the arithmetic misleads
#   - unsettled data        -> the number is real and will simply firm up
# Every producer takes the same four arguments, including the ones that ignore
# some of them. The uniform signature is what lets decorate_result treat the
# tuple as data; a producer needing something extra is a signal to widen this
# contract rather than to special-case one entry.
#
# `cfg` is passed in rather than read here. An earlier version had the funnel
# entry call load_config() directly, which raised NameError on every run —
# load_config is imported *inside* run_cli, not at module scope — and
# decorate_result's own `except Exception: continue` swallowed it, so the
# retention warning silently never fired. The unit tests called the helper
# directly and stayed green. Passing config down removes the whole class of
# problem and drops a duplicate read of config.json.
_NOTE_PIPELINE = (
    ("unsettled", lambda r, spec, pid, cfg: add_unsettled_data_note(r, spec)),
    # Cohort-only: date_ranges-based "unsettled" above never matches a cohort
    # spec's date_range/offsets shape, so this covers the offset equivalent —
    # a no-op on any other report type.
    ("cohort_unsettled", lambda r, spec, pid, cfg: add_cohort_unsettled_note(r, spec)),
    ("period_comparison", lambda r, spec, pid, cfg: add_period_comparison_notes(r, spec)),
    ("expression_ratio", lambda r, spec, pid, cfg: add_expression_ratio_note(r, spec)),
    ("rolling_ratio", lambda r, spec, pid, cfg: add_rolling_ratio_note(r, spec)),
    ("weekday_name_sort", lambda r, spec, pid, cfg: add_weekday_name_sort_note(r, spec)),
    ("appversion_sort", lambda r, spec, pid, cfg: add_appversion_sort_note(r, spec)),
    ("expression_revenue", lambda r, spec, pid, cfg: add_expression_revenue_note(r, spec)),
    ("expression_sampling", lambda r, spec, pid, cfg: add_expression_sampling_note(r, spec)),
    # Funnel-only: retention limits funnels and explorations, not standard
    # reports. Reads the property's setting from config, which ga-auth stores at
    # selection time; the helper is a no-op on non-funnel responses.
    ("funnel_retention", lambda r, spec, pid, cfg: add_funnel_retention_note(
        r, spec, cfg.get("event_data_retention_months"))),
    ("missing_dates", lambda r, spec, pid, cfg: add_missing_date_note(r)),
    ("unset_dimensions", lambda r, spec, pid, cfg: add_unset_dimension_note(
        r, platforms=cfg.get("platforms"))),
    ("empty_filter", lambda r, spec, pid, cfg: add_empty_filter_note(r, spec)),
    # Subscription revenue beside zero purchase counts. Mutually exclusive with
    # the uninstrumented note on the same metrics: that one fires when no
    # purchase-family event was ever collected, this one when subscription
    # events demonstrably produced revenue. Uninstrumented keeps the top slot —
    # it is the stronger claim (the figure is not a measurement at all).
    ("subscription_revenue",
     lambda r, spec, pid, cfg: add_subscription_revenue_note(r, spec)),
    ("uninstrumented", lambda r, spec, pid, cfg: add_uninstrumented_metric_note(r, spec, pid)),
    # Metric-side twin of "unset_dimensions" platform checks: a metric that
    # can only ever be 0 on this property's stream type (see
    # _WEB_STREAM_METRICS) is a different claim than "never tracked" —
    # placed after uninstrumented so it takes the top slot when both somehow
    # applied, since "the stream doesn't exist" is the stronger statement.
    ("platform_mismatched_metric", lambda r, spec, pid, cfg: add_platform_mismatched_metric_note(
        r, spec, cfg.get("platforms"))),
)


def decorate_result(result, spec, property_id, config=None):
    """Attach every applicable note, in priority order, without risking the report.

    Each producer is isolated. Previously they all ran inside run_cli's single
    try block alongside the API call itself, so an exception in any one of them
    was caught by the handler for *the API call* and reported through
    format_api_error — turning a query whose data came back fine into a failure
    whose hint told the marketer to go check their authentication. A note is
    supplementary; losing one must never cost the report it annotates, and must
    never invent a cause that was not there.
    """
    if not isinstance(result, dict):
        return result
    if config is None:                      # direct callers (tests) may omit it
        from ga4_common import load_config
        config = load_config() or {}
    # Property metadata is not a note — it labels the figures with the currency
    # and timezone, which realtime responses carry nowhere else. Applied before
    # the notes so an unlabelled revenue figure never reaches the output.
    try:
        result = add_property_metadata(result, property_id, config)
    except Exception:  # noqa: BLE001 - annotation must not cost the report
        pass
    for _name, producer in _NOTE_PIPELINE:
        try:
            out = producer(result, spec, property_id, config)
        except Exception:  # noqa: BLE001 - see docstring
            continue
        if isinstance(out, dict):
            result = out
    return result


def no_property_error():
    """The {"ok": false} payload for "no property is configured".

    Shared because ga4_metadata.py answers the same situation and drifted: it
    still said "connect a GA4 property first" long after run_cli learned to name
    the folder it searched. Two qualities of answer to one question, in one
    skill, and nothing could notice.
    """
    from ga4_common import ga4_dir

    return {
        "ok": False,
        "error": "No property_id found",
        # Say which folder was searched. .ga4 is resolved against the current
        # working directory, so an already-connected user who runs this from a
        # subdirectory lands here — and "connect a property first" would send
        # them to redo a setup that is already done.
        "hint": (
            f"Looked in {ga4_dir()}. If you have not connected yet, do that "
            "with the ga-auth skill. If you already have, you are running "
            "from the wrong folder: change to the project directory, or set "
            "GA4_DIR to point at the existing .ga4."
        ),
    }


# ---- shared CLI helper -------------------------------------------------------

def run_cli(runner, description, argv=None, diagnose_compatibility=False,
            defaults_date_ranges=False):
    """Read stdin/--input JSON, run runner(property_id, spec), and print friendly JSON.

    Shared by the query, realtime, and pivot CLIs. On success it prints the
    result dict with indent=2; JSON parse failures, a missing property, and
    runner exceptions are all converted into a friendly JSON error plus
    sys.exit(1). (Since the audience is non-technical marketers, a raw
    traceback must never be shown.)

    diagnose_compatibility: on an "incompatible dimensions & metrics" error, ask
    the v1beta checkCompatibility RPC which fields actually conflict and say so.
    Off by default because it is only correct for the standard Data API report:
    realtime and funnel (v1alpha) have their own field schemas, so naming a
    v1beta conflict for one of those would be a confident wrong answer — the
    exact failure this diagnosis exists to prevent. The three v1beta report
    scripts (query, pivot, cohort) opt in.

    defaults_date_ranges: this script fills an absent `date_ranges` with
    DEFAULT_RANGE before calling GA4, so the note producers must reason about
    that same period rather than the literally-absent key. Every producer that
    reads `date_ranges` was silently blind to the default path, which is the
    ordinary way to ask a question — omitting the key is documented and
    supported. Measured: `{"metrics": ["eventCount"]}` (7-day default ending
    yesterday, squarely inside the 24-48h processing window) got NO "data is
    still settling" warning, and `{"metrics": ["dauPerMau"], "dimensions":
    [...]}` got no rolling-ratio warning while still being told to "query
    again with no dimensions" — the exact re-query this cycle proved returns a
    sum of daily values rather than a ratio. Opt in from query, pivot and
    funnel; cohort (`date_range`, singular) and realtime (`minute_ranges`)
    default nothing and must not be given a period they never had.

    `request.spec` still echoes what the caller actually sent — the resolved
    period feeds the producers only, so provenance stays honest.
    """
    import argparse
    import json
    import sys
    from pathlib import Path

    from ga4_common import format_api_error, load_config

    ap = argparse.ArgumentParser(description=description)
    ap.add_argument("--property")
    ap.add_argument("--input", help="Path to a request JSON file (defaults to stdin)")
    args = ap.parse_args(argv)

    try:
        raw = (
            Path(args.input).read_text(encoding="utf-8")
            if args.input
            else sys.stdin.read()
        )
        spec = json.loads(raw)
    except (OSError, json.JSONDecodeError) as e:
        print(json.dumps({
            "ok": False,
            "error": f"Failed to read request JSON: {e}",
            "hint": "Pass a valid JSON spec via stdin or --input.",
        }, ensure_ascii=False))
        sys.exit(1)

    # Read once and pass down: decorate_result and add_property_metadata used to
    # each re-read this file, and the funnel branch tried a third time.
    cfg = load_config() or {}
    pid = args.property or cfg.get("property_id")
    if not pid:
        print(json.dumps(no_property_error(), ensure_ascii=False))
        sys.exit(1)
    try:
        result = runner(pid, spec)
        # Attach request context so results can be traced back when recombined.
        # When running several queries and combining them, the output alone
        # should reveal which period/filter each result came from. The
        # original dict is not mutated (the caller may reuse the runner's
        # return value).
        if isinstance(result, dict):
            effective = spec
            if (defaults_date_ranges and isinstance(spec, dict)
                    and not spec.get("date_ranges")):
                effective = {**spec, "date_ranges": [DEFAULT_RANGE]}
            result = decorate_result(result, effective, pid, cfg)
            result = {**result, "request": {"property_id": pid, "spec": spec}}
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:  # noqa: BLE001 - CLI converts this into a friendly JSON error
        # What was attempted matters even more on failure (same provenance as
        # the success path). format_api_error is a shared function duplicated
        # per skill, so it's appended here without touching its contract.
        # Mind the spread order: ok/error/hint must come first so a larger spec
        # doesn't push hint further down. Flipping it to
        # {"request": ..., **format_api_error(e)} would silently break readability.
        err = format_api_error(e)
        # GA4's own incompatibility message frequently names no field at all
        # (see the diagnosis block above), so replace the hint only when we can
        # actually name the conflict. If we can't, format_api_error's hint is
        # still the better of the two — never trade a real hint for a vague one.
        if diagnose_compatibility and is_incompatibility_error(e):
            hint = incompatibility_hint(find_incompatible_pairs(pid, spec))
            if hint:
                err["hint"] = hint
        err = {**err, "request": {"property_id": pid, "spec": spec}}
        print(json.dumps(err, ensure_ascii=False, indent=2))
        sys.exit(1)
