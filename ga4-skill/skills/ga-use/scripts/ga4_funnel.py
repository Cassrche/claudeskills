"""Run the GA4 Data API runFunnelReport. (v1alpha, requires venv)

Funnel (conversion/drop-off) report. Extended JSON spec (stdin or --input):
{
  "steps": [
    {"name": "Page view", "event_name": "page_view"},
    {"name": "Add to cart", "event_name": "add_to_cart", "within_duration_seconds": 3600},
    {"name": "Purchase", "event_name": "purchase"}
  ],
  "is_open_funnel": false,
  "date_ranges": [{"start_date": "28daysAgo", "end_date": "yesterday"}],
  "funnel_visualization_type": "STANDARD_FUNNEL",   // or TRENDED_FUNNEL
  "funnel_breakdown": {"dimension": "deviceCategory", "limit": 5},
  "limit": 250
}

Each step is defined by exactly one of event_name / field(+value|in_list) /
filter_expression (full control). Shaping the two sub-reports
(funnel_table, funnel_visualization) and the CLI live in the shared module.
runFunnelReport is v1alpha, so it uses AlphaAnalyticsDataClient (get_alpha_data_client).
"""
from ga4_common import get_alpha_data_client
from ga4_reporting import (
    DEFAULT_RANGE,
    DIMENSION_LEAF_KEYS,
    as_bool,
    as_positive_int,
    build_date_ranges,
    filter_value,
    check_spec_keys,
    reject_stray_leaf_keys,
    require_in_list_values,
    require_name_string,
    require_single_filter_value,
    run_cli,
    shape_funnel_response,
)

VIZ_TYPES = ("STANDARD_FUNNEL", "TRENDED_FUNNEL")

# Keys the funnel_breakdown object actually reads.
FUNNEL_BREAKDOWN_KEYS = {"dimension", "limit"}

# Keys a leaf inside a step's filter_expression reads. NOT applied in
# _field_leaf/_event_leaf themselves: _step passes the whole step dict
# (which also carries "name" and the timing options) to the same two
# functions, and STEP_KEYS already covers that path. Only the nested
# full-control path lacked a check.
# Same set as ga4_reporting.DIMENSION_LEAF_KEYS, imported rather than restated:
# the point of this change was to reject unknown filter-leaf keys, and two copies
# of the accepted-key list is how the next accepted key gets added to only one.
FUNNEL_FIELD_LEAF_KEYS = DIMENSION_LEAF_KEYS
FUNNEL_EVENT_LEAF_KEYS = {"event_name"}

# Keys _step actually reads, for the per-step unknown-key check. The three
# mode keys plus name and the two adjacency/timing options; the leaf details
# (value/match_type/case_sensitive/in_list) belong to _field_leaf, which is
# why they are listed here too — a step in field mode carries them inline.
STEP_KEYS = {
    "name", "event_name", "field", "filter_expression",
    "value", "match_type", "case_sensitive", "in_list",
    "within_duration_seconds", "is_directly_followed_by",
}

# The top-level keys build_funnel_request actually reads. Other keys
# (dimension_filter, segments, funnel_next_action, metric_filter, etc.) used
# to be silently ignored — you'd think you set a filter, but got unfiltered
# data with no warning, so the numbers were silently wrong. Even where GA4
# itself supports these, this script doesn't (see "Unsupported (excluded)
# features" in references/analysis-guide.md), so instead of silently
# swallowing them, we explain why and block before the API call.
KNOWN_SPEC_KEYS = {
    "steps", "is_open_funnel", "date_ranges",
    "funnel_visualization_type", "funnel_breakdown", "limit",
}
UNSUPPORTED_KEY_REASONS = {
    "dimension_filter": "Request-level filters are unsupported here — only per-step filters via steps[].field/value.",
    "metric_filter": "Funnel does not support metric filters.",
    "segments": "Segment comparison is unsupported in this script.",
    "funnel_next_action": "Next-action analysis is unsupported in this script.",
}


def _check_known_keys(spec):
    # Delegate to the shared function so all five scripts follow the same rule
    # (including camelCase guidance).
    check_spec_keys(spec, KNOWN_SPEC_KEYS, UNSUPPORTED_KEY_REASONS, "ga4_funnel.py")


# ---- step filter leaves -----------------------------------------------------

def _field_leaf(node):
    from google.analytics.data_v1alpha.types import (
        FunnelFieldFilter,
        FunnelFilterExpression,
        InListFilter,
        StringFilter,
    )

    field = require_name_string(
        node["field"],
        "funnel step's field",
        '{"field": "deviceCategory", "value": "mobile"} — "field" is a plain '
        "name string, not an object.",
    )
    case_sensitive = as_bool(node.get("case_sensitive"), "case_sensitive")
    if "in_list" in node:
        values = require_in_list_values(node["in_list"])
        ff = FunnelFieldFilter(
            field_name=field,
            in_list_filter=InListFilter(
                values=[str(filter_value(v, "in_list entry")) for v in values],
                case_sensitive=case_sensitive,
            ),
        )
        return FunnelFilterExpression(funnel_field_filter=ff)
    if "value" not in node:
        raise ValueError(f"field definition requires value or in_list: {node!r}")
    value = filter_value(node["value"], "step filter value")
    require_single_filter_value(value, "step filter value")
    match = node.get("match_type", "EXACT")
    try:
        match_type = StringFilter.MatchType[match]
    except KeyError:
        raise ValueError(
            f"Unknown match_type: {match!r}. "
            "Must be one of EXACT, CONTAINS, BEGINS_WITH, ENDS_WITH, FULL_REGEXP, PARTIAL_REGEXP."
        )
    ff = FunnelFieldFilter(
        field_name=field,
        string_filter=StringFilter(
            match_type=match_type,
            value=str(value),
            case_sensitive=case_sensitive,
        ),
    )
    return FunnelFilterExpression(funnel_field_filter=ff)


def _event_leaf(node):
    from google.analytics.data_v1alpha.types import FunnelEventFilter, FunnelFilterExpression

    event_name = require_name_string(
        node["event_name"],
        "funnel step's event_name",
        '{"event_name": "purchase"} — "event_name" is a plain name string, '
        "not an object.",
    )
    return FunnelFilterExpression(
        funnel_event_filter=FunnelEventFilter(event_name=event_name)
    )


def build_funnel_filter_expression(node):
    """Recursively convert a dict node into a FunnelFilterExpression (step filter_expression, full control)."""
    from google.analytics.data_v1alpha.types import (
        FunnelFilterExpression,
        FunnelFilterExpressionList,
    )

    # Mirrors ga4_reporting.py's build_filter_expression, including its
    # non-dict guard: with the stray-key check first, a bool/str node would
    # otherwise raise a raw TypeError ("argument of type 'bool' is not
    # iterable") with no usable hint. _step only type-checks the top-level
    # filter_expression, not nodes nested inside it, so this is the only
    # place that catches a malformed child.
    if not isinstance(node, dict):
        raise ValueError(
            f"Funnel filter condition must be an object: {node!r}. "
            'Example: {"event_name": "purchase"} '
            'or {"field": "deviceCategory", "value": "mobile"}'
        )
    # Same silent-drop bug as build_filter_expression: and/or/not are checked
    # before event_name/field below, so a stray leaf key sitting next to a
    # combinator used to vanish with no error. Confirmed live: {"and":
    # [{"event_name": "purchase"}], "field": "deviceCategory", "value":
    # "mobile"} as a step's filter_expression reported 163 users — close to
    # the *unfiltered* purchase count (169) and far from the mobile-only 84,
    # i.e. the device condition never applied.
    reject_stray_leaf_keys(node, ("event_name", "field"), "Funnel filter condition")
    if "and" in node:
        return FunnelFilterExpression(and_group=FunnelFilterExpressionList(
            expressions=[build_funnel_filter_expression(n) for n in node["and"]]))
    if "or" in node:
        return FunnelFilterExpression(or_group=FunnelFilterExpressionList(
            expressions=[build_funnel_filter_expression(n) for n in node["or"]]))
    if "not" in node:
        return FunnelFilterExpression(not_expression=build_funnel_filter_expression(node["not"]))
    # camelCase here silently changes WHICH USERS MATCH: "matchType" leaves
    # match_type at its EXACT default, so a CONTAINS step condition quietly
    # becomes exact-match. Same bug as ga4_reporting._dimension_leaf, in
    # funnel's parallel leaf builder — found by mechanically enumerating every
    # dict-reading site rather than re-reading the list I had built by hand.
    if "event_name" in node:
        check_spec_keys(node, FUNNEL_EVENT_LEAF_KEYS, script="funnel event condition")
        return _event_leaf(node)
    if "field" in node:
        check_spec_keys(node, FUNNEL_FIELD_LEAF_KEYS, script="funnel field condition")
        return _field_leaf(node)
    raise ValueError(f"Unknown filter shape: {node!r}")


# ---- step assembly ----------------------------------------------------------

def _step(s):
    from google.analytics.data_v1alpha.types import FunnelStep

    if not isinstance(s, dict):
        raise ValueError(f"steps item must be an object: {s!r}")
    name = s.get("name")
    if not name:
        raise ValueError(f"step requires name: {s!r}")
    name = require_name_string(
        name,
        "step's name",
        '"name": "Purchase" — a plain string, not an object.',
    )
    modes = [k for k in ("event_name", "field", "filter_expression") if k in s]
    if len(modes) != 1:
        raise ValueError(
            f"step '{name}' must be defined with exactly one of event_name, field, filter_expression. "
            f"Found: {modes}"
        )
    mode = modes[0]
    # A step-level and/or/not is meaningless in EVERY mode, so this check is
    # unconditional. _event_leaf/_field_leaf only read
    # event_name/field/value/match_type/case_sensitive/in_list, and the
    # filter_expression branch below only reads s["filter_expression"] — so a
    # combinator sitting at the step's own level is never read in any of the
    # three, and silently vanishes. Confirmed live in field mode: such a step
    # reported 165 users, close to the *unfiltered* purchase count (169) and
    # far from the mobile-only 84 — a step named "mobile purchase" that
    # actually measured all purchases. This originally excluded
    # filter_expression mode, which left that exact hole open one key over
    # (caught in review): {"filter_expression": {...}, "and": [...]} dropped
    # the "and" just as silently. Conditions belong INSIDE filter_expression.
    reject_stray_leaf_keys(
        s,
        ("event_name", "field", "filter_expression"),
        f"step {name!r}",
        fix_hint=(
            "and/or/not only work inside filter_expression (full control). Use "
            f'{{"name": {name!r}, "filter_expression": {{"and": [...]}}}} '
            "instead to combine conditions."
        ),
        # Inverted vs. the filter builders: here the mode key wins and the
        # step's own and/or/not is what silently vanishes.
        combinator_is_dropped=True,
    )
    # Deliberately AFTER the combinator check, and STEP_KEYS deliberately
    # excludes and/or/not. Both reject the same input, but the check above
    # explains the specific mistake and shows the filter_expression shape that
    # fixes it, while this one would only say "'and' is not supported" — the
    # generic message is the right fallback for every OTHER stray key
    # (camelCase, typos), not for the one mistake we have a real answer for.
    check_spec_keys(s, STEP_KEYS, script="steps item")
    if mode == "event_name":
        expr = _event_leaf(s)
    elif mode == "field":
        expr = _field_leaf(s)
    else:
        fx = s["filter_expression"]
        if not isinstance(fx, dict):
            raise ValueError(f"filter_expression must be an object: {fx!r}")
        expr = build_funnel_filter_expression(fx)

    kw = {"name": name, "filter_expression": expr}
    if "is_directly_followed_by" in s:
        kw["is_directly_followed_by"] = as_bool(
            s["is_directly_followed_by"], "is_directly_followed_by")
    if "within_duration_seconds" in s:
        secs = s["within_duration_seconds"]
        if not isinstance(secs, int) or isinstance(secs, bool):
            raise ValueError(f"within_duration_seconds must be an integer (seconds): {secs!r}")
        from google.protobuf.duration_pb2 import Duration

        kw["within_duration_from_prior_step"] = Duration(seconds=secs)
    return FunnelStep(**kw)


# ---- request assembly ----------------------------------------------------

def build_funnel_request(property_id, spec):
    from google.analytics.data_v1alpha.types import (
        DateRange,
        Dimension,
        Funnel,
        FunnelBreakdown,
        RunFunnelReportRequest,
    )

    _check_known_keys(spec)
    steps = spec.get("steps")
    # Check the list type first: a non-list value like a dict gets an accurate
    # message (distinct from empty/single-item cases).
    if steps is not None and not isinstance(steps, list):
        raise ValueError(f"steps must be a list: {steps!r}")
    if not steps:
        raise ValueError("steps is required: specify at least 2 funnel steps.")
    if len(steps) < 2:
        raise ValueError("A funnel requires at least 2 steps.")

    funnel = Funnel(
        is_open_funnel=as_bool(spec.get("is_open_funnel"), "is_open_funnel"),
        steps=[_step(s) for s in steps],
    )

    viz = spec.get("funnel_visualization_type", "STANDARD_FUNNEL")
    if viz not in VIZ_TYPES:
        raise ValueError(
            f"Unknown funnel_visualization_type: {viz!r}. "
            "Must be one of STANDARD_FUNNEL, TRENDED_FUNNEL."
        )

    ranges = spec.get("date_ranges") or [DEFAULT_RANGE]
    kwargs = {
        "property": f"properties/{property_id}",
        "date_ranges": build_date_ranges(ranges, alpha=True),
        "funnel": funnel,
        "funnel_visualization_type": RunFunnelReportRequest.FunnelVisualizationType[viz],
    }

    bd = spec.get("funnel_breakdown")
    if bd is not None:
        if not isinstance(bd, dict):
            raise ValueError(f"funnel_breakdown must be an object: {bd!r}")
        # Caught in review: a typo'd "limit" was dropped and GA4 silently
        # applied its own default of 5 — the user asked for a 3-row breakdown
        # and got 5 with no indication.
        check_spec_keys(bd, FUNNEL_BREAKDOWN_KEYS, script="funnel_breakdown")
        dim = bd.get("dimension")
        if not dim:
            raise ValueError("funnel_breakdown requires dimension.")
        dim = require_name_string(
            dim,
            "funnel_breakdown's dimension",
            '"dimension": "deviceCategory" — a plain name string, not an object.',
        )
        fb_kwargs = {"breakdown_dimension": Dimension(name=dim)}
        if "limit" in bd:
            fb_kwargs["limit"] = as_positive_int(bd["limit"], "funnel_breakdown's limit")
        kwargs["funnel_breakdown"] = FunnelBreakdown(**fb_kwargs)

    if "limit" in spec:
        kwargs["limit"] = as_positive_int(spec["limit"], "limit")

    return RunFunnelReportRequest(**kwargs)


# ---- execution --------------------------------------------------------------

def run_funnel_report(property_id, spec, client=None, platforms=None):
    if client is None:
        client = get_alpha_data_client()
    resp = client.run_funnel_report(build_funnel_request(property_id, spec))
    # step_names is always passed, breakdown or not. With breakdown, a step
    # normally produces several rows (one per breakdown value, plus any
    # RESERVED_TOTAL rows) — shape_funnel_response's own guard
    # (`len(seen) == len(rows)`) already declines to report anything unless
    # every row parses to a distinct step index, so a populated breakdown
    # table naturally stays silent on this note without needing to be told
    # about breakdown at all. The one case that guard *does* trust is the
    # degenerate one this used to miss entirely: a totally empty table
    # (0 rows) with a breakdown requested still had `seen == rows == 0`, but
    # step_names was unconditionally suppressed for any breakdown funnel, so
    # a completely empty breakdown response got no explanation whatsoever —
    # not even the baseline "GA4 omits zero-reach rows" note a non-breakdown
    # funnel gets. Verified live: an in-retention onboarding funnel with
    # funnel_breakdown set and zero total rows came back with only the
    # unrelated unsettled-ranges note, nothing about the missing steps.
    step_names = [s.get("name") for s in spec.get("steps", []) if isinstance(s, dict)]
    return shape_funnel_response(resp, step_names=step_names, platforms=platforms)


# ---- CLI ----------------------------------------------------------------

def main(argv=None):
    # run_cli loads config itself, but only *after* calling the runner (it
    # needs the runner's result before decorate_result can use cfg) — too
    # late for shape_funnel_response's per-breakdown unset-dimension check,
    # which runs inside the runner. Load it here too so a funnel_breakdown on
    # a web-only dimension (e.g. landingPage) on an app-only property gets the
    # same "expected, not a tracking gap" treatment ga4_query.py's top-level
    # dimensions already get (see add_unset_dimension_note). A second small
    # local file read, not an API call, so the duplication this project
    # otherwise avoids (see run_cli's own comment) costs nothing real here.
    from ga4_common import load_config
    platforms = (load_config() or {}).get("platforms")

    def runner(property_id, spec, client=None):
        return run_funnel_report(property_id, spec, client=client, platforms=platforms)

    run_cli(runner, "GA4 Data API runFunnelReport(v1alpha)", argv,
            defaults_date_ranges=True)


if __name__ == "__main__":
    main()
