"""Run the GA4 Data API runPivotReport. (requires venv)

Cross-tab (pivot) report. Extended JSON spec (stdin or --input):
{
  "dimensions": ["country", "deviceCategory"],
  "metrics": ["eventCount"],
  "date_ranges": [{"start_date": "7daysAgo", "end_date": "yesterday"}],
  "pivots": [
    {"field_names": ["country"], "limit": 10,
     "order_bys": [{"metric": "eventCount", "desc": true}],
     "metric_aggregations": ["TOTAL"]},
    {"field_names": ["deviceCategory"], "limit": 5}
  ],
  "dimension_filter": { ... },   // same syntax as ga4_query
  "metric_filter": { ... }
}
Each pivot's field_names dimensions must also appear in top-level dimensions
(GA4 requirement). Filtering, ordering, and response shaping live in the shared
ga4_reporting module.
"""
from ga4_common import get_data_client
from ga4_reporting import (
    DEFAULT_RANGE,
    as_int,
    build_date_ranges,
    as_positive_int,
    require_string_list,
    build_filter_expression,
    build_order_bys,
    check_spec_keys,
    run_cli,
    shape_pivot_response,
    add_pivot_aggregation_note,
)


# ---- request assembly ------------------------------------------------------

def _filter_fields(node, key):
    """Collect field names from a filter tree. key is 'field' (dimension) or 'metric'."""
    if not isinstance(node, dict):
        return []
    for group in ("and", "or"):
        if group in node:
            items = node[group] if isinstance(node[group], (list, tuple)) else []
            return [f for n in items for f in _filter_fields(n, key)]
    if "not" in node:
        return _filter_fields(node["not"], key)
    name = node.get(key)
    return [name] if isinstance(name, str) and name else []


def _check_filter_fields(spec):
    """Check up front that fields used in filters are also in the requested dimensions/metrics.

    Unlike runReport, runPivotReport returns a 400 if a filter target isn't in
    the requested list ("Filter field_name ... is missing from requested
    dimensions"). Left as-is, that looks like an auth problem and sends the
    user toward auth troubleshooting, so we explain the reason and stop before
    the call.
    """
    checks = (
        ("dimension_filter", "field", "dimensions", "dimension(s)"),
        ("metric_filter", "metric", "metrics", "metric(s)"),
    )
    for spec_key, node_key, list_key, label in checks:
        node = spec.get(spec_key)
        if not node:
            continue
        requested = [d for d in (spec.get(list_key) or []) if isinstance(d, str)]
        missing = [f for f in _filter_fields(node, node_key) if f not in requested]
        if missing:
            raise ValueError(
                f"For pivot, filter targets must also be in the requested list (GA4 constraint). "
                f"{label.capitalize()} missing from {list_key}: {', '.join(sorted(set(missing)))} "
                f"— add them to {list_key} and retry. "
                f"Current {list_key}: {requested or '(none)'}"
            )

def _metric_aggregations(values):
    from google.analytics.data_v1beta.types import MetricAggregation

    if not isinstance(values, (list, tuple)):
        raise ValueError(f"metric_aggregations must be a list: {values!r}")
    out = []
    for v in values:
        try:
            out.append(MetricAggregation[v])
        except KeyError:
            raise ValueError(
                f"Unknown metric_aggregation: {v!r}. "
                "Must be one of TOTAL, MINIMUM, MAXIMUM, COUNT."
            )
    return out


# For a multi date_ranges response, GA4 lets Pivot/OrderBy treat "dateRange" as
# a dimension, but it can never go in top-level dimensions (causes a 400). So
# this field is the one exception to the general rule that a pivot axis
# dimension must also be in top-level dimensions.
DIMENSIONLESS_PIVOT_FIELDS = {"dateRange"}

# Keys _pivot actually reads, for the per-entry unknown-key check.
PIVOT_KEYS = {"field_names", "limit", "offset", "order_bys", "metric_aggregations"}

# GA4 demands a limit on every pivot axis (an axis without one is a 400, not an
# unbounded result). When the caller omits it, default it so the query runs instead
# of erroring — see _pivot. For a SINGLE axis GA4 recommends 10000, but it also
# caps the PRODUCT of all axis limits at 250000 ("The product of the limit
# parameter cannot exceed 250000", measured live): two axes both defaulting to
# 10000 give 100M and fail. So the per-axis default is scaled down with the axis
# count (with headroom) to keep the product under the cap.
DEFAULT_PIVOT_LIMIT = 10000
PIVOT_LIMIT_PRODUCT_CAP = 250000


def _default_pivot_limit(n_axes):
    """Per-axis default limit when the caller omits pivots[].limit. A single axis
    gets GA4's recommended 10000; with several axes the default is scaled down so
    the product of all defaults stays under PIVOT_LIMIT_PRODUCT_CAP (half of the
    nth-root, as headroom)."""
    if n_axes <= 1:
        return DEFAULT_PIVOT_LIMIT
    return max(1, int(PIVOT_LIMIT_PRODUCT_CAP ** (1.0 / n_axes)) // 2)


def _pivot(p, all_dimensions, default_limit=DEFAULT_PIVOT_LIMIT):
    from google.analytics.data_v1beta.types import Pivot

    if not isinstance(p, dict):
        raise ValueError(f"pivots item must be an object: {p!r}")
    # Same reasoning as the top-level check_spec_keys: a typo'd or camelCase
    # key here is silently ignored, so "limt": 5 quietly falls back to the
    # API's default of 10 and the result looks like a normal (just differently
    # sized) answer.
    check_spec_keys(p, PIVOT_KEYS, script="pivots item")
    if not p.get("field_names"):
        raise ValueError(f"pivot requires field_names: {p!r}")
    # require_string_list rejects a non-list, a bare string (silently split
    # character-by-character otherwise), and any non-string element — the
    # last of those used to reach Pivot(field_names=...) unchecked and leak
    # "TypeError: unhashable type: 'dict'" for a raw-API-shaped entry like
    # {"field_names": [{"dimension_name": "country"}]} (caught in review,
    # Jul 2026 — the same opaque-crash class require_name_string exists to
    # stop elsewhere in this file, just missed here originally).
    field_names = require_string_list(p["field_names"], "pivots item's field_names")
    missing = [
        f for f in field_names
        if f not in all_dimensions and f not in DIMENSIONLESS_PIVOT_FIELDS
    ]
    if missing:
        raise ValueError(
            f"pivot field_names {missing} not found in dimensions. "
            "Pivot axis dimensions must also be included in top-level dimensions."
        )
    kw = {"field_names": list(field_names)}
    if "limit" in p:
        kw["limit"] = as_positive_int(p["limit"], "pivots item's limit")
    else:
        # GA4 requires a limit on EVERY pivot axis — omitting it is not "no limit"
        # but a hard 400 ("limit is required in PivotReportRequests", measured live
        # on a dateRange axis left without one). A caller who leaves it off almost
        # certainly wants the axis's values, not an error, so default it rather than
        # failing (single axis: GA4's recommended 10000; several axes: scaled down so
        # the product stays under GA4's 250000 cap — see _default_pivot_limit). If an
        # axis has more values than its limit, pivot_axes[].truncated still fires, so
        # "you only saw the top slice" is never hidden by the default.
        kw["limit"] = default_limit
    if "offset" in p:
        kw["offset"] = as_int(p["offset"], "pivots item's offset")
    order_bys = build_order_bys(p.get("order_bys"))
    if order_bys:
        kw["order_bys"] = order_bys
    if "metric_aggregations" in p:
        kw["metric_aggregations"] = _metric_aggregations(p["metric_aggregations"])
    return Pivot(**kw)


KNOWN_SPEC_KEYS = {
    "dimensions", "metrics", "date_ranges", "pivots", "dimension_filter", "metric_filter",
}
# For pivot, ordering and limits are **per axis** (pivots[].order_bys / .limit /
# .offset). Putting them at the top level would be silently ignored, resulting
# in an unsorted default 10-row result — a Top-N that's silently wrong.
UNSUPPORTED_KEY_REASONS = {
    "order_bys": "Pivot orders per axis — put it in pivots[].order_bys.",
    "limit": "Pivot limits per axis — put it in pivots[].limit.",
    "offset": "Pivot skips per axis — put it in pivots[].offset.",
    "metric_aggregations": "Pivot aggregates per axis — put it in pivots[].metric_aggregations.",
}


def build_pivot_request(property_id, spec):
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunPivotReportRequest,
    )

    check_spec_keys(spec, KNOWN_SPEC_KEYS, UNSUPPORTED_KEY_REASONS, "ga4_pivot.py")
    pivots = spec.get("pivots")
    # Check the list type first: this gives an accurate message for a
    # non-list-but-truthy value like {}.
    if pivots is not None and not isinstance(pivots, list):
        raise ValueError(f"pivots must be a list: {pivots!r}")
    if not pivots:
        raise ValueError("pivots is required: specify at least one pivot axis.")
    for idx, p in enumerate(pivots):
        if isinstance(p, dict) and "dateRange" in (p.get("field_names") or []) \
                and idx != len(pivots) - 1:
            raise ValueError(
                "A pivot using dateRange as an axis must be the last entry in pivots "
                "(GA4 constraint: \"The date_range pivot axis must be the last one.\"). "
                "Move the dateRange entry to the end of the pivots array."
            )

    dimensions = require_string_list(spec.get("dimensions"), "dimensions")
    if "dateRange" in dimensions:
        raise ValueError(
            "Do not put 'dateRange' in dimensions (GA4 constraint) — "
            "with 2 or more date_ranges, you can use 'dateRange' directly as an axis in "
            "pivots[].field_names (it never goes in top-level dimensions). "
            "Remove 'dateRange' from dimensions and retry."
        )
    ranges = spec.get("date_ranges") or [DEFAULT_RANGE]
    default_limit = _default_pivot_limit(len(pivots))
    built_pivots = [_pivot(p, dimensions, default_limit) for p in pivots]
    # GA4 caps the product of all axis limits at 250000. An omitted limit gets a
    # per-axis-count default, but a large EXPLICIT limit on one axis can still push
    # the product over — catch it locally with a clear, actionable message instead
    # of GA4's bare 400 (measured live: an explicit 100000 plus a defaulted axis
    # gave a 25M product and failed).
    product = 1
    for bp in built_pivots:
        product *= bp.limit
    if product > PIVOT_LIMIT_PRODUCT_CAP:
        raise ValueError(
            f"The product of the pivot limits ({product}) exceeds GA4's cap of "
            f"{PIVOT_LIMIT_PRODUCT_CAP}. Reduce the per-axis limits in pivots[].limit "
            "(an omitted limit is already defaulted for the axis count, but a large "
            "explicit limit on one axis can still push the product over)."
        )
    kwargs = {
        "property": f"properties/{property_id}",
        "dimensions": [Dimension(name=d) for d in dimensions],
        "metrics": [Metric(name=m)
                    for m in require_string_list(spec.get("metrics"), "metrics")],
        "date_ranges": build_date_ranges(ranges),
        "pivots": built_pivots,
    }
    _check_filter_fields(spec)
    if spec.get("dimension_filter"):
        kwargs["dimension_filter"] = build_filter_expression(spec["dimension_filter"], "dimension")
    if spec.get("metric_filter"):
        kwargs["metric_filter"] = build_filter_expression(spec["metric_filter"], "metric")
    return RunPivotReportRequest(**kwargs)


# ---- execution --------------------------------------------------------------

def run_pivot_report(property_id, spec, client=None):
    if client is None:
        client = get_data_client()
    resp = client.run_pivot_report(build_pivot_request(property_id, spec))
    return add_pivot_aggregation_note(shape_pivot_response(resp), spec)


# ---- CLI ----------------------------------------------------------------

def main(argv=None):
    run_cli(run_pivot_report, "GA4 Data API runPivotReport", argv, diagnose_compatibility=True,
            defaults_date_ranges=True)


if __name__ == "__main__":
    main()
