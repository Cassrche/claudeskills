"""Run the GA4 Data API runRealtimeReport. (requires venv)

Queries realtime activity from the last 30 minutes. Extended JSON spec
(stdin or --input):
{
  "dimensions": ["country", "eventName"],
  "metrics": ["eventCount"],
  // activeUsers cannot be combined with any other realtime metric (GA4 constraint,
  // rejected locally) — query it alone if you need it.
  "minute_ranges": [{"start_minutes_ago": 29, "end_minutes_ago": 0, "name": "last30"}],
  "dimension_filter": { ... },   // same syntax as ga4_query
  "metric_filter": { ... },
  "order_bys": [ ... ],
  "limit": 100
}
Filtering, ordering, and response shaping live in the shared ga4_reporting module.
Realtime supports only a limited set of dimensions/metrics (see references/analysis-guide.md).
"""
from ga4_common import get_data_client
from ga4_reporting import (
    as_int,
    build_filter_expression,
    as_positive_int,
    require_string_list,
    build_order_bys,
    check_spec_keys,
    run_cli,
    shape_report_response,
)


# ---- request assembly ------------------------------------------------------

# Keys _minute_range actually reads, for the per-entry unknown-key check.
MINUTE_RANGE_KEYS = {"start_minutes_ago", "end_minutes_ago", "name"}


def _minute_range(r):
    from google.analytics.data_v1beta.types import MinuteRange

    if not isinstance(r, dict):
        raise ValueError(f"minute_ranges item must be an object: {r!r}")
    # camelCase ("startMinutesAgo") was silently ignored, leaving the window at
    # its default instead of the requested one — a realtime number for a
    # different period than the one asked about.
    check_spec_keys(r, MINUTE_RANGE_KEYS, script="minute_ranges item")
    kw = {}
    start = end = None
    if "start_minutes_ago" in r:
        start = as_int(r["start_minutes_ago"], "minute_ranges item's start_minutes_ago")
        kw["start_minutes_ago"] = start
    if "end_minutes_ago" in r:
        end = as_int(r["end_minutes_ago"], "minute_ranges item's end_minutes_ago")
        kw["end_minutes_ago"] = end
    # Both bounds given in the wrong order. These are "minutes ago", so the window
    # START is the LARGER number (further in the past) — the opposite of an ordinary
    # from/to range. An inverted pair (start < end) is rejected by GA4 with a bare
    # 400 that states the rule but not the "ago" convention behind it, so the caller
    # keeps flipping the values the wrong way. Name it with the fix. start == end is
    # a valid single-minute window. (Measured live: {start:0, end:5} for "the last 5
    # minutes" — the natural way to write it — failed; {start:5, end:0} is correct.)
    if start is not None and end is not None and start < end:
        raise ValueError(
            f"minute_ranges item's start_minutes_ago must be >= end_minutes_ago "
            f"(got start={start}, end={end}): these count 'minutes ago', so the larger "
            "number is further in the past. For 'the last 5 minutes' use "
            '{"start_minutes_ago": 5, "end_minutes_ago": 0}.'
        )
    if r.get("name"):
        kw["name"] = r["name"]
    return MinuteRange(**kw)


KNOWN_SPEC_KEYS = {
    "dimensions", "metrics", "minute_ranges", "dimension_filter", "metric_filter",
    "order_bys", "limit",
}
UNSUPPORTED_KEY_REASONS = {
    "date_ranges": "Realtime has no configurable period (fixed to the last 30 minutes) — "
                   "use minute_ranges to narrow the window, or ga4_query.py for past periods.",
    "offset": "Realtime reports do not support offset (skipping pages).",
}


def build_realtime_request(property_id, spec):
    from google.analytics.data_v1beta.types import (
        Dimension,
        Metric,
        RunRealtimeReportRequest,
    )

    check_spec_keys(spec, KNOWN_SPEC_KEYS, UNSUPPORTED_KEY_REASONS, "ga4_realtime.py")
    metric_names = require_string_list(spec.get("metrics"), "metrics")
    # Realtime's activeUsers is incompatible with EVERY other realtime metric —
    # GA4 answers only "400 Selected dimensions and metrics cannot be queried
    # together", which never says which metric is the problem. Measured on a
    # live property (Jul 2026): activeUsers fails combined with each of
    # eventCount, screenPageViews, keyEvents, while those three combine freely
    # with one another. "How many people are buying right now" naturally
    # reaches for activeUsers + eventCount, so this combination hits the opaque
    # 400 every time — name the rule locally instead of forwarding it.
    if "activeUsers" in metric_names:
        # Dedupe: ["activeUsers", "activeUsers"] is activeUsers alone, not a
        # combination — raising there would print empty parens ("with other
        # metrics ().") and block a request GA4 answers fine.
        others = sorted({m for m in metric_names if m != "activeUsers"})
        if others:
            raise ValueError(
                f"Realtime cannot combine activeUsers with other metrics ({', '.join(others)}). "
                "GA4 rejects that pairing with only an opaque 'Selected dimensions "
                "and metrics cannot be queried together' — activeUsers is the odd "
                "one out (it combines with no other realtime metric). Split it into "
                "two realtime queries (activeUsers alone, then the others) and "
                "report the numbers side by side."
            )
    kwargs = {
        "property": f"properties/{property_id}",
        "dimensions": [Dimension(name=d)
                       for d in require_string_list(spec.get("dimensions"), "dimensions")],
        "metrics": [Metric(name=m) for m in metric_names],
        "limit": as_positive_int(spec.get("limit", 100), "limit"),
    }
    mr = spec.get("minute_ranges")
    if mr:
        if not isinstance(mr, list):
            raise ValueError(f"minute_ranges must be a list: {mr!r}")
        kwargs["minute_ranges"] = [_minute_range(r) for r in mr]
    if spec.get("dimension_filter"):
        kwargs["dimension_filter"] = build_filter_expression(spec["dimension_filter"], "dimension")
    if spec.get("metric_filter"):
        kwargs["metric_filter"] = build_filter_expression(spec["metric_filter"], "metric")
    order_bys = build_order_bys(spec.get("order_bys"))
    if order_bys:
        kwargs["order_bys"] = order_bys
    return RunRealtimeReportRequest(**kwargs)

# ---- execution --------------------------------------------------------------

def run_realtime_report(property_id, spec, client=None):
    if client is None:
        client = get_data_client()
    resp = client.run_realtime_report(build_realtime_request(property_id, spec))
    return shape_report_response(resp)


# ---- CLI ----------------------------------------------------------------

def main(argv=None):
    run_cli(run_realtime_report, "GA4 Data API runRealtimeReport", argv)


if __name__ == "__main__":
    main()
