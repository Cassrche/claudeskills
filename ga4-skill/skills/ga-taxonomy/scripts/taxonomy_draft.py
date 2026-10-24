"""[stdlib] Reverse-engineers a draft taxonomy CSV from what's actually collected (collected_events.json).
Pure logic — no API access. The draft is written to a separate CSV and does not overwrite taxonomy.json.
"""
import argparse
import csv
import json
import sys

from ga4_common import collected_events_path, ga4_dir
from taxonomy_schema import (AUTO_COLLECTED_EVENTS, OPERATIONAL_HEADERS,
                             RECOMMENDED_EVENTS)

# Standard descriptions for GA4's automatically collected / enhanced
# measurement events, keyed by event name. taxonomy_schema.AUTO_COLLECTED_EVENTS
# is the single source of truth (also used by taxonomy_diff.py) — see its
# docstring/comment there.
AUTO_EVENTS = AUTO_COLLECTED_EVENTS


def build_draft_rows(collected):
    # The 9-column operational template: Category, Event Label, GA4 Event Name, Description,
    #                                    Parameter Name, Parameter Type, Parameter Description,
    #                                    Example Value, Parameter Scope
    rows = [list(OPERATIONAL_HEADERS)]
    for ev in collected:
        if not isinstance(ev, dict):
            continue
        name = ev.get("name", "")
        if not name:
            continue
        # Auto-collected wins over recommended when a name is in both (only
        # ad_impression is, and its description says so). Mis-labelling a name
        # the author DOES control as auto-collected would tell them not to
        # document it, which costs more than the reverse.
        if name in AUTO_EVENTS:
            category, desc = "Auto-collected", AUTO_EVENTS[name]
        elif name in RECOMMENDED_EVENTS:
            # Google defines what these mean, so hand back the definition rather
            # than a blank row for one of the best-documented events in GA4 —
            # `purchase` drafted as an empty line is how a taxonomy ends up
            # defining it as something non-standard, upstream of every ecommerce
            # analysis that follows. Still the author's to confirm: this says
            # what the name means, not that the site sends it correctly.
            category, desc = "Recommended", RECOMMENDED_EVENTS[name]
        else:
            category, desc = "(Uncategorized)", ""
        # What's actually collected only has the collection key, so both the event label and
        # GA4 event name are filled with name (the marketer fills in the label later).
        # Row width must track OPERATIONAL_HEADERS (len(...) - filled, not a hand-counted
        # literal), so a column added or removed at the END of the template keeps rows the
        # right length without a manual edit here. `filled` is still positional (indices
        # 0-3 = category/label/ga4_name/description), so this does NOT guard against a
        # column inserted or reordered in the MIDDLE of OPERATIONAL_HEADERS -- that would
        # silently misalign the filled values while row length still matches the header
        # and the length-parity test still passes.
        filled = [category, name, name, desc]
        rows.append(filled + [""] * (len(OPERATIONAL_HEADERS) - len(filled)))
    return rows


def draft_path():
    return ga4_dir() / "taxonomy_draft.csv"


def write_draft():
    cp = collected_events_path()
    if not cp.exists():
        return {
            "ok": False,
            "error": "The collected-events cache (collected_events.json) is missing.",
            "hint": "Fetch what's actually collected first with ga4_events.py list.",
        }
    try:
        data = json.loads(cp.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return {
            "ok": False,
            "error": f"The collected-events cache is corrupted: {e}",
            "hint": "Regenerate the file with ga4_events.py list.",
        }
    if not isinstance(data, dict):
        return {
            "ok": False,
            "error": "The collected-events cache has an invalid structure (the top level isn't an object).",
            "hint": "Regenerate the file with ga4_events.py list.",
        }
    collected = data.get("events", [])
    rows = build_draft_rows(collected)
    ga4_dir().mkdir(parents=True, exist_ok=True)
    with open(draft_path(), "w", encoding="utf-8-sig", newline="") as f:
        csv.writer(f).writerows(rows)
    return {"ok": True, "event_count": len(rows) - 1, "saved_to": str(draft_path())}


def main(argv=None):
    # Takes no arguments, but still parses them. Without this, `--help` would
    # **run** instead of showing help, overwriting taxonomy_draft.csv — a file
    # must not be destroyed just from browsing the CLI.
    argparse.ArgumentParser(
        description="Reverse-engineer a draft taxonomy CSV from what's actually collected (collected_events.json) (no arguments)"
    ).parse_args(argv)
    result = write_draft()
    print(json.dumps(result, ensure_ascii=False))
    if not result.get("ok"):
        sys.exit(1)


if __name__ == "__main__":
    main()
