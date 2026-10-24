"""[venv] Google Sheets URL -> intermediate {sheet name: [[cell,...],...]} form.

Access to the Sheets API v4 is isolated in _default_reader. Injecting a
reader into fetch_sheets lets the URL-parsing/transform logic be tested
without the API (using the system python3).
"""
import argparse
import json
import re
import sys

from ga4_common import format_api_error, load_credentials


BAD_URL_HINT = (
    "Copy the Google Sheets link from your browser's address bar and paste it "
    "in (the docs.google.com/spreadsheets/... form).\n"
    "Notion pages, Drive folders, and shortened links cannot be read."
)


def parse_sheet_url(url: str):
    """URL -> (spreadsheet_id, gid|None). Raises ValueError if not found."""
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9\-_]+)", url)
    if not m:
        raise ValueError(f"Not a Google Sheets URL: {url}")
    sid = m.group(1)
    g = re.search(r"[#&?]gid=([0-9]+)", url)
    return sid, (g.group(1) if g else None)


def _quote_range(title: str) -> str:
    """Safely quotes a sheet name as an A1 range. Handles spaces/special
    characters, doubling any internal single quote."""
    return "'" + str(title).replace("'", "''") + "'"


def _default_reader(spreadsheet_id):
    """The real Sheets API call. spreadsheet_id -> {sheet name: [[cell,...],...]}."""
    from googleapiclient.discovery import build

    service = build("sheets", "v4", credentials=load_credentials(), cache_discovery=False)
    meta = service.spreadsheets().get(
        spreadsheetId=spreadsheet_id, includeGridData=False
    ).execute()
    titles = [s["properties"]["title"] for s in meta.get("sheets", [])]
    sheets = {}
    for title in titles:
        resp = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=_quote_range(title)
        ).execute()
        rows = resp.get("values", [])
        sheets[title] = [[("" if c is None else str(c).strip()) for c in row] for row in rows]
    return sheets


def fetch_sheets(url: str, reader=None) -> dict:
    spreadsheet_id, _gid = parse_sheet_url(url)
    if reader is None:
        reader = _default_reader
    return reader(spreadsheet_id)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Read an event taxonomy from Google Sheets (for debugging)")
    ap.add_argument("url", help="Google Sheets URL")
    args = ap.parse_args(argv)
    try:
        sheets = fetch_sheets(args.url)
    except ValueError as e:
        # A malformed URL is a local validation failure — routing it through
        # the API error formatter would send the wrong "check your
        # authentication status" advice, leaving the marketer stuck.
        print(json.dumps({
            "ok": False,
            "error": str(e),
            "hint": BAD_URL_HINT,
        }, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:  # noqa: BLE001
        print(json.dumps(format_api_error(e), ensure_ascii=False))
        sys.exit(1)
    print(json.dumps({"ok": True, "sheets": list(sheets.keys())}, ensure_ascii=False))


if __name__ == "__main__":
    main()
