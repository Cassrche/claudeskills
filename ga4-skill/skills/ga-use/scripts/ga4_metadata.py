"""GA4 metadata lookup. (requires venv)

- get-metadata: query available dimensions/metrics via the Data API getMetadata.
  Credentials come from token.json (get_data_client) — no ADC dependency.
"""
import argparse
import json
import sys

from ga4_reporting import no_property_error
from ga4_common import format_api_error, get_data_client, load_config


def matches(entry, terms):
    """True when any term appears in the API name or the UI name (case-insensitive)."""
    if not terms:
        return True
    haystack = f"{entry['api_name']} {entry['ui_name']}".lower()
    return any(t in haystack for t in terms)


def get_metadata(property_id, client=None, search=None, kind=None):
    """Available dimensions/metrics, optionally narrowed by search term and kind.

    A property returns roughly 400 dimensions and 120 metrics — about 12k
    tokens of JSON. This skill's own instructions say to look the metadata up
    whenever a field name is uncertain, so answering "what is the item category
    dimension called" used to cost the entire catalogue, every time.

    Filtered responses still report the unfiltered totals. A narrowed list that
    looked like the whole catalogue would be the same silent-truncation problem
    this module's callers are warned about elsewhere.
    """
    from google.analytics.data_v1beta.types import GetMetadataRequest

    if client is None:
        client = get_data_client()
    md = client.get_metadata(
        GetMetadataRequest(name=f"properties/{property_id}/metadata")
    )
    dims = [{"api_name": d.api_name, "ui_name": d.ui_name} for d in md.dimensions]
    mets = [{"api_name": m.api_name, "ui_name": m.ui_name} for m in md.metrics]
    terms = [t.strip().lower() for t in (search or []) if t.strip()]

    out = {}
    if kind != "metric":
        out["dimensions"] = [d for d in dims if matches(d, terms)]
    if kind != "dimension":
        out["metrics"] = [m for m in mets if matches(m, terms)]
    if terms or kind:
        out["filtered"] = {
            "search": terms,
            "kind": kind,
            "total_dimensions": len(dims),
            "total_metrics": len(mets),
        }
        # An empty result from a search reads as "GA4 has no such field", and
        # answering a marketer that way ends the question with a false fact. The
        # match is plain substring against the API and UI names, so it misses
        # whenever GA4's naming differs from how the field is spoken about
        # ("cart add" never finds itemsAddedToCart). Same failure this function's
        # `filtered` key already guards against — a narrowed view mistaken for
        # the catalogue — one step further along.
        if terms and not any(out.get(k) for k in ("dimensions", "metrics")):
            out["note"] = (
                "No name matched. The search is a plain substring match against the "
                "API and UI names, so a wording GA4 does not use will miss even when "
                "the field exists — try a shorter or more literal word, or drop "
                "--search to see the full list. This is not evidence that the field "
                "does not exist."
            )
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description="GA4 metadata")
    sub = ap.add_subparsers(dest="cmd", required=True)
    mp = sub.add_parser("get-metadata", help="Available dimensions/metrics")
    mp.add_argument("--property")
    mp.add_argument("--search", action="append", metavar="TERM",
                    help="Only entries whose API or UI name contains TERM "
                         "(case-insensitive). Repeatable; entries matching ANY "
                         "term are kept. The unfiltered catalogue is ~12k tokens, "
                         "so prefer this when looking one field up.")
    mp.add_argument("--kind", choices=("dimension", "metric"),
                    help="Return only dimensions or only metrics.")
    args = ap.parse_args(argv)

    if args.cmd == "get-metadata":
        pid = args.property or (load_config() or {}).get("property_id")
        if not pid:
            print(json.dumps(no_property_error(), ensure_ascii=False))
            sys.exit(1)
        try:
            print(json.dumps(
                get_metadata(pid, search=args.search, kind=args.kind),
                ensure_ascii=False, indent=2))
        except Exception as e:  # noqa: BLE001 - CLI converts this into a friendly JSON error
            print(json.dumps(format_api_error(e), ensure_ascii=False, indent=2))
            sys.exit(1)


if __name__ == "__main__":
    main()
