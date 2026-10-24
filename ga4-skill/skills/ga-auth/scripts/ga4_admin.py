"""GA4 Admin API: lists the properties you have access to. (venv required)

list_properties and get_property accept an injectable client so tests can
substitute a mock.
"""
import argparse
import json
import sys

from ga4_common import format_api_error, get_admin_client


def list_properties(client=None):
    client = client or get_admin_client()
    out = []
    for summary in client.list_account_summaries():
        for ps in summary.property_summaries:
            out.append(
                {
                    "account": summary.display_name,
                    "property_id": ps.property.split("/")[-1],
                    "property_name": ps.display_name,
                }
            )
    return out


# The account summaries above carry only an id and a display name. Two fields a
# marketer cannot infer live on the full Property resource instead:
#
#   currency_code  the currency revenue is reported in. It does NOT follow from
#                  the country or the language: a property measured here runs on
#                  Asia/Seoul time and reports in USD, so reading its revenue as
#                  won is out by roughly 1300x with nothing to hint at it.
#   time_zone      what "today" and "28daysAgo" resolve against — the property's
#                  timezone, not the machine's.
#
# Report responses also carry these, but only runReport-family ones do; a
# realtime response has no metadata block at all. Fetching them once at property
# selection means every skill knows the currency **before** running a query
# rather than discovering it in the output.
# Months per retention setting. Google's own wording is in months, and the enum
# carries nothing numeric, so the mapping has to live somewhere.
RETENTION_MONTHS = {
    "TWO_MONTHS": 2,
    "FOURTEEN_MONTHS": 14,
    "TWENTY_SIX_MONTHS": 26,     # 360 only
    "THIRTY_EIGHT_MONTHS": 38,   # 360 only
    "FIFTY_MONTHS": 50,          # 360 only
}

# GA4's own vocabulary for these platforms is inconsistent, and that decides the
# mapping. Measured 2026-08-14 by querying the `platform` dimension: an app
# property returns `iOS` and `Android`, a web property returns `web` —
# capitalised for the apps, lowercase for the web. Storing a tidied-up lowercase
# form would break the one thing the value is for: dropped into a filter, `ios`
# matches nothing and GA4 reports no error, just zero rows.
STREAM_TYPE_PLATFORMS = {
    "WEB_DATA_STREAM": "web",
    "IOS_APP_DATA_STREAM": "iOS",
    "ANDROID_APP_DATA_STREAM": "Android",
}
UNKNOWN_PLATFORM = "unknown"

# Fixed order rather than sorted(): ASCII puts these in the order Android, iOS,
# web, which reads oddly for a list a human scans. Fixed order also keeps the
# output deterministic regardless of how the API returns the streams.
PLATFORM_ORDER = ("web", "iOS", "Android", UNKNOWN_PLATFORM)


def _stream_platform(stream) -> str:
    """The stored platform name for one data stream.

    An unrecognised type becomes "unknown" rather than being dropped. Dropping
    it would make a property whose only stream failed to classify look like it
    has no streams at all — and a confident "web only" is worse than no answer,
    which is the whole failure mode this feature exists to remove.
    """
    kind = getattr(stream, "type_", None)
    name = getattr(kind, "name", None) or str(kind or "")
    return STREAM_TYPE_PLATFORMS.get(name, UNKNOWN_PLATFORM)


def list_data_streams(property_id, client=None):
    """The property's data streams as {"type", "display_name"} dicts.

    Kept as its own function so get_property can catch its failure without the
    try/except swallowing anything else.
    """
    from google.analytics.admin_v1beta.types import ListDataStreamsRequest

    client = client or get_admin_client()
    return [
        {"type": _stream_platform(s), "display_name": s.display_name}
        for s in client.list_data_streams(
            ListDataStreamsRequest(parent=f"properties/{property_id}")
        )
    ]


def _ordered_platforms(streams):
    seen = {s["type"] for s in streams}
    return [p for p in PLATFORM_ORDER if p in seen]


def get_property(property_id, client=None):
    """Full property record: currency, timezone, name, account, data retention,
    data streams.

    Retention is fetched because it silently changes what a **funnel** can
    answer. Google states the setting "does not affect standard aggregated
    reports ... only explorations and funnel reports"
    (support.google.com/analytics/answer/7667196, checked 2026-07-22) — and the
    Data API's runFunnelReport is a funnel report. Measured on a live property
    set to 14 months: a January-2025 funnel came back with zero rows and no
    error, while runReport over the identical period returned 783 add_to_cart
    and 136 purchase events.
    """
    from google.analytics.admin_v1beta.types import (
        GetDataRetentionSettingsRequest,
        GetPropertyRequest,
    )

    client = client or get_admin_client()
    prop = client.get_property(GetPropertyRequest(name=f"properties/{property_id}"))
    out = {
        "property_id": str(property_id),
        "property_name": prop.display_name,
        "account": prop.account,
        "currency_code": prop.currency_code,
        "time_zone": prop.time_zone,
    }
    # A separate call, and one the token may not be allowed to make. Losing it
    # must not cost the rest of the record — the currency and timezone above
    # matter on every query, retention only on funnels.
    try:
        settings = client.get_data_retention_settings(GetDataRetentionSettingsRequest(
            name=f"properties/{property_id}/dataRetentionSettings"))
        name = settings.event_data_retention.name
        out["event_data_retention"] = name
        out["event_data_retention_months"] = RETENTION_MONTHS.get(name)
    except Exception:  # noqa: BLE001 - optional enrichment, never fatal
        pass
    # A third optional call, same contract as retention above. The platform is
    # context, not arithmetic: it does not change what a number means, it
    # changes which events and dimensions can exist at all. So losing it must
    # not fail the property selection — the keys are simply absent, which reads
    # as "not known". An empty list is the different, confirmed answer: this
    # property has no data streams.
    try:
        streams = list_data_streams(property_id, client=client)
        out["data_streams"] = streams
        out["platforms"] = _ordered_platforms(streams)
    except Exception:  # noqa: BLE001 - optional enrichment, never fatal
        pass
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="GA4 Admin API")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list-properties", help="List accessible properties")
    gp = sub.add_parser(
        "get-property",
        help="Name, currency, timezone, data retention and data streams "
             "(platforms) for one property",
    )
    gp.add_argument("property_id")
    args = ap.parse_args(argv)

    try:
        if args.cmd == "list-properties":
            print(json.dumps(list_properties(), ensure_ascii=False, indent=2))
        elif args.cmd == "get-property":
            print(json.dumps(get_property(args.property_id), ensure_ascii=False, indent=2))
    except Exception as e:  # noqa: BLE001 - the CLI turns this into a friendly JSON error
        print(json.dumps(format_api_error(e), ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
