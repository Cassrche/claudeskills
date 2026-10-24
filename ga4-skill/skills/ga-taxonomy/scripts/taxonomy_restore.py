"""[stdlib] Rolls back the event taxonomy from the backup generation right before a parse.

A parse replaces both taxonomy.json and taxonomy.md together, and parse_taxonomy
backs up both files as one generation under `.ga4/taxonomy_backups/<timestamp>/`.

Restoring by hand (cp) makes it easy to roll back only the json and forget the
md, leaving a mismatch where taxonomy_diff reads the restored taxonomy but
ga-use reads a broken md — and nobody notices (ga_journey only checks
taxonomy_present). So this makes rolling back a single command that treats
both files as one atomic unit.

  taxonomy_restore.py                     # list generations that can be restored
  taxonomy_restore.py --generation latest # restore the most recent generation
  taxonomy_restore.py --generation 20260721-101014
"""
import argparse
import json
import sys
from pathlib import Path

from ga4_common import ga4_dir, taxonomy_json_path, taxonomy_md_path
from parse_taxonomy import (
    BACKUP_DIR_NAME,
    BACKUP_STAMP_GLOB,
    backup_existing,
    countable_len,
)

LATEST = "latest"


def backup_root():
    return ga4_dir() / BACKUP_DIR_NAME


def _summarize(generation):
    """Turns one generation folder into a listing summary. Kept in the list even if corrupted."""
    info = {"generation": generation.name, "path": str(generation)}
    jf = generation / taxonomy_json_path().name
    info["has_json"] = jf.exists()
    info["has_md"] = (generation / taxonomy_md_path().name).exists()
    try:
        data = json.loads(jf.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return info
    if isinstance(data, dict):
        # Shared with parse_taxonomy's replaced-counts so the two never
        # disagree about the same file. None means "couldn't tell".
        info["event_count"] = countable_len(data.get("events"))
        info["user_property_count"] = countable_len(data.get("user_properties"))
        info["source"] = data.get("source")
    return info


def list_generations():
    root = backup_root()
    if not root.is_dir():
        return []
    try:
        found = [p for p in root.glob(BACKUP_STAMP_GLOB) if p.is_dir()]
    except OSError:
        return []
    # Folder names are timestamps, so lexical order == chronological order. Reversed so the newest is first.
    return [_summarize(p) for p in sorted(found, reverse=True)]


def resolve(generations, wanted):
    if not generations:
        return None
    if wanted == LATEST:
        return generations[0]
    for g in generations:
        if g["generation"] == wanted:
            return g
    return None


def restore(wanted):
    generations = list_generations()
    if not generations:
        return {
            "ok": False,
            "error": "There is no backup to restore from.",
            "hint": f"A backup is created at {backup_root()} whenever the taxonomy is parsed. "
                    "If you haven't parsed one yet, parse the original taxonomy file first.",
        }

    target = resolve(generations, wanted)
    if target is None:
        return {
            "ok": False,
            "error": f"No such backup generation: {wanted!r}",
            "generations": generations,
            "hint": "Specify one of the generations above with --generation, or use "
                    "--generation latest to pick the most recent one.",
        }

    src = Path(target["path"])
    src_json = src / taxonomy_json_path().name
    if not src_json.exists():
        return {
            "ok": False,
            "error": f"This backup generation has no taxonomy file: {src_json}",
            "hint": "Pick a different generation with --generation.",
        }

    # Restoring also overwrites the current state, so back up the current state before restoring.
    # This makes it possible to back out again if the wrong generation was restored.
    try:
        undo_path, _counts = backup_existing()
    except OSError:
        undo_path = None

    try:
        ga4_dir().mkdir(parents=True, exist_ok=True)
        taxonomy_json_path().write_bytes(src_json.read_bytes())
        src_md = src / taxonomy_md_path().name
        if src_md.exists():
            taxonomy_md_path().write_bytes(src_md.read_bytes())
            md_restored = True
        else:
            # An older generation with no md. Restoring only the json would leave
            # a mismatch where ga-use keeps reading the old md, so this is
            # reported honestly instead of staying silent about it.
            md_restored = False
    except OSError as e:
        return {
            "ok": False,
            "error": f"Restore failed: {e}",
            "hint": f"Check that {ga4_dir()} is writable.",
        }

    result = {
        "ok": True,
        "restored_from": target["generation"],
        "json": str(taxonomy_json_path()),
        "md_restored": md_restored,
        "undo_backup": str(undo_path) if undo_path else None,
    }
    for key in ("event_count", "user_property_count", "source"):
        if key in target:
            result[key] = target[key]
    if not md_restored:
        result["warning"] = (
            "This backup generation has no taxonomy.md, so the taxonomy summary could not be "
            "restored. Since ga-use reads taxonomy.md, it's safer to re-parse from the "
            "original taxonomy file."
        )
    return result


def main(argv=None):
    ap = argparse.ArgumentParser(description="Roll back the event taxonomy to a backup generation")
    ap.add_argument("--generation", "-g", default=None,
                    help=f"The generation (timestamp) to restore, or {LATEST!r}. Only lists if omitted.")
    args = ap.parse_args(argv)

    if args.generation is None:
        generations = list_generations()
        print(json.dumps({
            "ok": True,
            "generations": generations,
            "hint": ("To restore, run with --generation <generation> or --generation latest."
                     if generations else
                     f"No backups yet. A backup is created at {backup_root()} when the taxonomy is parsed."),
        }, ensure_ascii=False))
        return

    result = restore(args.generation)
    print(json.dumps(result, ensure_ascii=False))
    if not result["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
