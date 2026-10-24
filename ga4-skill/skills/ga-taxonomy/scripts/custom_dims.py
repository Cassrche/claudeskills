"""[venv] Extracts custom definitions (dimensions/metrics) from GA4 metadata
and saves them to .ga4/custom_definitions.json.

Access to the google library is isolated in _default_runner. Injecting a
runner into fetch lets the logic be tested without the API (using the
system python3).
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone

from ga4_common import (
    custom_definitions_path,
    format_api_error,
    ga4_dir,
    get_data_client,
    load_config,
)

# Observed category strings follow the "<scope>-scoped Custom <kind>" shape,
# e.g. "Event-scoped Custom Dimension" (confirmed on Event/User dimensions and
# metrics). Matching a pattern instead of a hardcoded table lets the item
# scope be handled too, without guessing.
_CATEGORY_RE = re.compile(r"^(Event|User|Item)-scoped Custom (Dimension|Metric)$")

# Aggregation variants are determined by the api_name prefix.
_AGGREGATION_PREFIXES = (
    ("averageCustomEvent:", "average"),
    ("countCustomEvent:", "count"),
)


def _classify(api_name, category):
    """-> (scope, kind), or None if it cannot be classified (-> other)."""
    m = _CATEGORY_RE.match(category or "")
    if not m:
        return None
    if ":" not in api_name:
        return None
    return m.group(1).lower(), m.group(2).lower()


def _aggregation(api_name):
    for prefix, label in _AGGREGATION_PREFIXES:
        if api_name.startswith(prefix):
            return label
    return "default"


def build_registry(dimension_rows, metric_rows):
    """(api_name, ui_name, category, type_name) rows -> registry dict.

    dimension_rows/metric_rows only ever contain rows already filtered to
    custom_definition=True.
    """
    by_parameter = {}
    other = []
    counts = {"dimension": 0, "metric": 0, "other": 0}

    for rows, expected_kind in ((dimension_rows, "dimension"), (metric_rows, "metric")):
        for api_name, ui_name, category, type_name in rows:
            classified = _classify(api_name, category)
            if classified is None or classified[1] != expected_kind:
                other.append({
                    "api_name": api_name, "ui_name": ui_name, "category": category,
                })
                counts["other"] += 1
                continue
            scope, kind = classified
            entry = {
                "scope": scope, "kind": kind,
                "api_name": api_name, "ui_name": ui_name,
            }
            if kind == "metric":
                entry["aggregation"] = _aggregation(api_name)
                entry["type"] = type_name
            param = api_name.split(":", 1)[1]
            by_parameter.setdefault(param, []).append(entry)
            counts[kind] += 1

    return {"ok": True, "counts": counts, "by_parameter": by_parameter, "other": other}


def _default_runner(property_id):
    """The real metadata call. -> (dimension_rows, metric_rows).

    Filters by the custom_definition flag. Does not use api_name prefix
    parsing (confirmed in practice that this misses 4 entries such as
    sessionCustomChannelGroup:).
    """
    from google.analytics.data_v1beta.types import GetMetadataRequest

    client = get_data_client()
    md = client.get_metadata(
        GetMetadataRequest(name=f"properties/{property_id}/metadata")
    )
    dims = [
        (d.api_name, d.ui_name, d.category, None)
        for d in md.dimensions if d.custom_definition
    ]
    mets = [
        (m.api_name, m.ui_name, m.category, m.type_.name)
        for m in md.metrics if m.custom_definition
    ]
    return dims, mets


def fetch(runner=None):
    cfg = load_config()
    if not cfg or not cfg.get("property_id"):
        raise RuntimeError(
            "No property is connected. First connect to GA4 with the ga-auth skill."
        )
    property_id = str(cfg["property_id"])
    if runner is None:
        runner = _default_runner
    dims, mets = runner(property_id)
    registry = build_registry(dims, mets)
    registry["property_id"] = property_id
    # Stamped for the same reason collected_events.json is: this file decides
    # whether a parameter is reported as queryable, and it is a snapshot. A
    # definition registered in GA4 after the snapshot still reads "Not
    # registered — cannot query", sending the marketer to register something
    # they already registered; one deleted since still reads as registered, and
    # the query 400s. Neither is visible without knowing how old the file is.
    registry["fetched_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return registry


def write_cache(registry):
    ga4_dir().mkdir(parents=True, exist_ok=True)
    custom_definitions_path().write_text(
        json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return registry


def main(argv=None):
    ap = argparse.ArgumentParser(description="Look up GA4 custom definitions")
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("fetch", help="Save the current custom dimension/metric status")
    ap.parse_args(argv)
    try:
        registry = fetch()
        write_cache(registry)
    except Exception as e:  # noqa: BLE001 - turn API/config/save errors into friendly JSON
        print(json.dumps(format_api_error(e), ensure_ascii=False))
        sys.exit(1)
    print(json.dumps({
        "ok": True,
        "counts": registry["counts"],
        "parameter_count": len(registry["by_parameter"]),
        "saved_to": str(custom_definitions_path()),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
