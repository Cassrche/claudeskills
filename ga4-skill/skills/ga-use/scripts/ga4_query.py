"""Run the GA4 Data API runReport. (requires venv)

Accepts an extended JSON spec (stdin or --input):
{
  "dimensions": ["eventName", "date"],
  "metrics": ["eventCount", "totalUsers"],
  "date_ranges": [{"start_date": "7daysAgo", "end_date": "yesterday"}],
  "dimension_filter": { ... },   // single/compound (and/or/not), match_type, in_list
  "metric_filter": { ... },      // numeric (op/between), and/or/not
  "order_bys": [ ... ],          // sorting / Top-N
  "limit": 100, "offset": 0
}
Filtering, ordering, and response shaping live in the shared ga4_reporting module.
"""
from ga4_common import get_data_client
from ga4_reporting import (
    DEFAULT_RANGE,
    as_int,
    build_date_ranges,
    as_positive_int,
    require_name_string,
    require_string_list,
    build_filter_expression,
    build_order_bys,
    check_spec_keys,
    run_cli,
    shape_report_response,
)


# ---- request assembly ------------------------------------------------------

def _metric(m):
    """Convert one metrics entry into a Metric.

    A string is treated as name only; an object accepts {"name", "expression"}
    (expression lets the API directly compute derived metrics like
    keyEvents/sessions).
    """
    from google.analytics.data_v1beta.types import Metric

    if isinstance(m, str):
        return Metric(name=m)
    if isinstance(m, dict):
        # Caught in review: without this, a typo'd or camelCase "expression"
        # was silently dropped and the request quietly became a plain metric.
        # With a real metric name that returns a perfectly plausible number —
        # the raw metric instead of the derived one — which is the same
        # silently-wrong-answer failure the nested-key sweep exists to stop,
        # sitting in the most-used script.
        check_spec_keys(m, METRIC_ITEM_KEYS, script="metrics item")
        name = m.get("name")
        if not name:
            raise ValueError(f"metrics object requires name: {m!r}")
        name = require_name_string(
            name,
            "metrics item's name",
            '{"name": "eventCount"} — "name" is a plain name string, not an object.',
        )
        if m.get("expression"):
            expression = require_name_string(
                m["expression"],
                "metrics item's expression",
                '{"expression": "keyEvents/sessions"} — "expression" is a plain '
                "string, not an object.",
            )
            return Metric(name=name, expression=expression)
        return Metric(name=name)
    raise ValueError(f"metrics item must be a string or object: {m!r}")


# Keys the object form of a metrics entry actually reads.
METRIC_ITEM_KEYS = {"name", "expression"}

KNOWN_SPEC_KEYS = {
    "dimensions", "metrics", "date_ranges", "dimension_filter", "metric_filter",
    "order_bys", "limit", "offset",
}
UNSUPPORTED_KEY_REASONS = {
    "pivots": "Use ga4_pivot.py for pivot axes.",
    "cohort_spec": "Use ga4_cohort.py for cohorts.",
    "minute_ranges": "Use ga4_realtime.py for realtime minute ranges.",
    "steps": "Use ga4_funnel.py for funnel steps.",
}


def build_request(property_id, spec):
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        RunReportRequest,
    )

    check_spec_keys(spec, KNOWN_SPEC_KEYS, UNSUPPORTED_KEY_REASONS, "ga4_query.py")
    ranges = spec.get("date_ranges") or [DEFAULT_RANGE]
    dimensions = require_string_list(spec.get("dimensions"), "dimensions")
    # When date_ranges has 2 or more entries, GA4 automatically attaches a
    # "dateRange" dimension (date_range_0, date_range_1, ...) to the response.
    # Adding it to the request dimensions (whether automatically or by hand)
    # causes a 400: "Field dateRange is not a dimension. ... does not need to
    # be listed in the Dimensions." So we never inject it ourselves, and if the
    # user added it by mistake, we explain why before the API call.
    if "dateRange" in dimensions:
        raise ValueError(
            "Do not put 'dateRange' in dimensions (GA4 constraint) — "
            "GA4 attaches it to results automatically when date_ranges has 2 or more entries. "
            "Remove 'dateRange' from dimensions and retry."
        )

    kwargs = {
        "property": f"properties/{property_id}",
        "dimensions": [Dimension(name=d) for d in dimensions],
        "metrics": [_metric(m) for m in require_string_list(spec.get("metrics"), "metrics", allow_objects=True)],
        "date_ranges": build_date_ranges(ranges),
        "limit": as_positive_int(spec.get("limit", 100), "limit"),
        "offset": as_int(spec.get("offset", 0), "offset"),
    }
    if spec.get("dimension_filter"):
        kwargs["dimension_filter"] = build_filter_expression(spec["dimension_filter"], "dimension")
    if spec.get("metric_filter"):
        kwargs["metric_filter"] = build_filter_expression(spec["metric_filter"], "metric")
    order_bys = build_order_bys(spec.get("order_bys"))
    if order_bys:
        kwargs["order_bys"] = order_bys
    return RunReportRequest(**kwargs)


# ---- execution --------------------------------------------------------------

def run_report(property_id, spec, client=None):
    if client is None:
        client = get_data_client()
    resp = client.run_report(build_request(property_id, spec))
    return shape_report_response(resp)


# ---- CLI ----------------------------------------------------------------

def main(argv=None):
    run_cli(run_report, "GA4 Data API runReport", argv, diagnose_compatibility=True,
            defaults_date_ranges=True)


if __name__ == "__main__":
    main()
