"""[venv] Queries the GA4 Data API for event names collected over the last N
days and saves them to .ga4/collected_events.json.

Access to the google library is isolated in _default_runner. Injecting a
runner into collect_events lets the logic be tested without the API (using
the system python3).
"""
import argparse
import json
import sys
from datetime import datetime, timezone

from ga4_common import (
    collected_events_path,
    format_api_error,
    ga4_dir,
    get_data_client,
    load_config,
)


def _default_runner(property_id, days):
    """The real Data API call. (property_id, days) -> [(event_name, count), ...]."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    client = get_data_client()
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="eventName")],
        metrics=[Metric(name="eventCount")],
        date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
    )
    response = client.run_report(request)
    return [
        (row.dimension_values[0].value, int(row.metric_values[0].value))
        for row in response.rows
    ]


def collect_events(days, runner=None):
    if days < 1:
        raise ValueError("days must be at least 1.")
    cfg = load_config()
    if not cfg or not cfg.get("property_id"):
        raise RuntimeError(
            "No property is connected. First connect to GA4 with the ga-auth skill."
        )
    property_id = str(cfg["property_id"])
    if runner is None:
        runner = _default_runner
    pairs = runner(property_id, days)
    events = [{"name": name, "count": count} for name, count in pairs]
    events.sort(key=lambda e: e["name"])
    return property_id, events


def write_cache(property_id, days, events):
    ga4_dir().mkdir(parents=True, exist_ok=True)
    # days is the **width** of the query window, not its position. Without a
    # timestamp, a 30-day pull from 8 months ago is indistinguishable from one
    # taken today, so a comparison would flag events that are actually coming
    # in fine right now as "not received". taxonomy_diff uses this value to
    # judge freshness.
    data = {
        "property_id": property_id,
        "days": days,
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "events": events,
    }
    collected_events_path().write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return data


def main(argv=None):
    ap = argparse.ArgumentParser(description="Look up events collected by GA4")
    sub = ap.add_subparsers(dest="command", required=True)
    lp = sub.add_parser("list", help="List events collected over the last N days")
    lp.add_argument("--days", type=int, default=30)
    args = ap.parse_args(argv)
    try:
        property_id, events = collect_events(args.days)
        write_cache(property_id, args.days, events)
    except Exception as e:  # noqa: BLE001 - turn API/config/save errors into friendly JSON
        print(json.dumps(format_api_error(e), ensure_ascii=False))
        sys.exit(1)
    print(
        json.dumps(
            {
                "ok": True,
                "event_count": len(events),
                "days": args.days,
                "saved_to": str(collected_events_path()),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
