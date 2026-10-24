"""Prints oauth_client/token/property status as JSON.

Does not import the GA4 library, so it can always run without the venv.
token_present is a lightweight check: it only looks at whether token.json
exists and contains a refresh_token. Actual token validity is confirmed at the
first API call, and refreshed automatically on expiry.
Only the venv dependency check calls the venv python, as a subprocess — this
process itself uses only the standard library.
"""
import json
import subprocess
import sys
from datetime import datetime, timezone

from ga4_common import (
    ga4_dir,
    has_stored_token,
    load_config,
    oauth_client_path,
)


# --- 8< --- dependency readiness check (replicated block starts) ---------------
# This block is replicated BYTE-FOR-BYTE in ga-auth/scripts/ga4_status.py and
# ga4/scripts/ga_journey.py. This repository keeps no shared package across
# skills (ga4_common.py follows the same convention). If you change one copy,
# change the other to match so the two stay diff-clean.
#
# Uses only the standard library. Do not import the packages being checked in
# this process — if the code that diagnoses whether the venv is empty depended
# on the venv itself, the diagnosis would be impossible.
# Instead, it asks by running the venv python as a subprocess exactly once.

# The actual top-level module name each skill imports (the import name, not the
# distribution package name). The ga4 skill uses only the standard library, so
# it has nothing to check.
SKILL_DEPS = {
    "ga-auth": [
        "google.analytics.data_v1beta",
        "google.analytics.admin",
        "google_auth_oauthlib",
    ],
    "ga-taxonomy": [
        "google.analytics.data_v1beta",
        "googleapiclient",
        "openpyxl",
    ],
    "ga-use": ["google.analytics.data_v1beta"],
}

_PROBE = """
import importlib, json, warnings
warnings.simplefilter("ignore")


def _ok(name):
    try:
        importlib.import_module(name)
        return True
    except Exception:
        return False


out = {}
for skill, names in json.loads(%r).items():
    out[skill] = [n for n in names if not _ok(n)]
print(json.dumps(out))
"""

# Keeps a broken venv from holding the diagnosis hostage. The normal path takes
# well under a second.
_PROBE_TIMEOUT = 30


def _venv_dir():
    # Even when the location has been moved via GA4_DIR, the fix command must
    # point at the actual venv. It used to be hardcoded to ".ga4/venv", which
    # created a dead end: install to the real location, re-check, and it would
    # still come back false.
    return ga4_dir() / "venv"


def _skills_root():
    # The installed skills root (the parent of this skill's directory), resolved
    # from this file's location so fix commands stay correct wherever the skills
    # are installed (.claude/skills, .agents/skills, ...). The local import keeps
    # the replicated block self-contained across both host files.
    from pathlib import Path
    return Path(__file__).resolve().parent.parent.parent


def _display_path(p) -> str:
    # Paths in fix commands: relative to cwd when possible (commands are run
    # from the project root), absolute otherwise.
    from pathlib import Path
    try:
        return str(p.relative_to(Path.cwd()))
    except ValueError:
        return str(p)


def _pip_command(skill: str) -> str:
    return (f"{_venv_dir() / 'bin' / 'pip'} install -r "
            f"{_display_path(_skills_root() / skill / 'requirements.txt')}")


def _probe_missing(venv_python):
    """Runs the venv python as a subprocess once to get each skill's list of missing modules.

    A failed run, a timeout, or unparseable output all come back as None (cannot
    tell). Reporting something as "missing" when we couldn't actually confirm it
    sends the marketer off to reinstall for no reason — it's always safer to say
    we don't know when we don't.
    """
    try:
        proc = subprocess.run(
            [str(venv_python), "-c", _PROBE % json.dumps(SKILL_DEPS)],
            capture_output=True,
            text=True,
            timeout=_PROBE_TIMEOUT,
        )
    except Exception:
        return None
    if proc.returncode != 0:
        return None
    try:
        data = json.loads(proc.stdout)
    except Exception:
        return None
    if not isinstance(data, dict) or set(data) != set(SKILL_DEPS):
        return None
    for names in data.values():
        if not isinstance(names, list) or not all(isinstance(n, str) for n in names):
            return None
    return data


def _venv_setup_command() -> str:
    """The fix when the venv itself doesn't exist — from creation through installing all skills."""
    lines = [f"python3 -m venv {_venv_dir()}"]
    lines += [_pip_command(s) for s in sorted(SKILL_DEPS)]
    return "\n".join(lines)


def dependency_status(venv_python) -> dict:
    """Builds the dependency keys to append to the status JSON (does not touch what venv_present means).

    - If the venv python doesn't exist: deps_ready=False, plus a deps_fix that
      starts from creating the venv. This used to just return an empty dict on
      the theory that "venv_present already says so" — but the consumer (the
      skill's SKILL.md) branches on deps_ready alone. So when the key
      disappeared entirely, no rule fired, and the skill ended up just running
      `.ga4/venv/bin/python` and showing the marketer a raw shell error
      (observed in practice: "no such file or directory"). One field should
      carry the whole truth.
    - If we can't tell: {"deps_ready": None}. Simply omitting the key would
      read as "everything's fine", so null explicitly says "we couldn't check".
    """
    if not venv_python.exists():
        return {
            "deps_ready": False,
            "missing_packages": dict(SKILL_DEPS),
            "deps_fix": _venv_setup_command(),
        }
    missing = _probe_missing(venv_python)
    if missing is None:
        return {"deps_ready": None}
    short = {skill: names for skill, names in missing.items() if names}
    if not short:
        return {"deps_ready": True}
    return {
        "deps_ready": False,
        "missing_packages": short,
        "deps_fix": "\n".join(_pip_command(s) for s in sorted(short)),
    }
# --- >8 --- dependency readiness check (replicated block ends) -----------------------------


def _platforms_age_days(checked_at):
    """Days since the platform list was last confirmed, or None if unknowable.

    A missing stamp and an unparseable one both give None: to a reader they mean
    the same thing — the age is not known, so the list should not be trusted
    without re-checking. A naive timestamp is read as UTC. ga4_auth.py writes an
    offset-aware stamp, so that branch is defensive: it exists for a config that
    was hand-edited or written by an older version. Do not drop it as dead code
    — subtracting a naive datetime from an aware one raises TypeError, and only
    ValueError is caught here, so one stale field would fail the whole
    diagnosis.

    Reported as a number rather than a verdict on purpose. The staleness
    threshold lives in the SKILL.md prose instead of a constant here, so it can
    be tuned without editing this function in two scripts that must stay in
    step.
    """
    if not checked_at:
        return None
    try:
        stamp = datetime.fromisoformat(str(checked_at))
    except ValueError:
        return None
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - stamp).days


# A property ID is digits only. `bool(cfg.get("property_id"))` only caught
# null/empty, so a non-empty but invalid value (a G- measurement ID, a
# half-edited string) reported property_configured=True — the router then sent
# the user to analysis, where it fails as "400 Invalid property ID" with a
# hint about authentication. ga4_auth.py validates this at save time, but a
# config written by an older version (which saved whatever it was given) or
# hand-edited since never went through that check. Duplicated verbatim in
# ga4_status.py and ga_journey.py — fix both together.
def _property_configured(value) -> bool:
    return bool(value) and str(value).strip().isdigit()


# .ga4 is resolved against the *current working directory* (or GA4_DIR), so
# running from a subdirectory makes every field below report false at once:
# not logged in, no OAuth client, no venv, no dependencies. That reads as "the
# whole setup is broken" and sends the user to redo the OAuth setup — long,
# painful, and aimed at the wrong problem, when the only fault is where the
# command was run from. Reporting the resolved path makes the diagnosis explain
# itself. Duplicated verbatim in ga4/scripts/ga_journey.py; fix both together.
def _dir_hint(d) -> str:
    return (
        f"No .ga4 directory at {d}. If you have not connected yet, that is "
        "expected — the ga-auth skill creates it. If you have already connected, "
        "you are running from the wrong folder: change to the project directory, "
        "or set GA4_DIR to point at the existing .ga4."
    )


def build_status() -> dict:
    cfg = load_config() or {}
    d = ga4_dir()
    venv_python = _venv_dir() / "bin" / "python"
    status = {
        "ga4_dir": str(d),
        "ga4_dir_present": d.is_dir(),
        "oauth_client_present": oauth_client_path().exists(),
        "token_present": has_stored_token(),
        "property_configured": _property_configured(cfg.get("property_id")),
        "property_id": cfg.get("property_id"),
        # Which platforms the property collects from. Context, not arithmetic:
        # it changes which events and dimensions can exist at all, so an
        # app-only property's missing page_view is not a tracking gap.
        "platforms": cfg.get("platforms"),
        "platforms_checked_at": cfg.get("platforms_checked_at"),
        "platforms_age_days": _platforms_age_days(cfg.get("platforms_checked_at")),
        "venv_present": venv_python.exists(),
    }
    status.update(dependency_status(venv_python))
    if not status["ga4_dir_present"]:
        status["hint"] = _dir_hint(d)
    return status


def main():
    # Same shape as ga4/scripts/ga_journey.py's main, which already had this:
    # these two are the pair of read-only status scripts, and only one of them
    # honoured the "always one clean JSON blob" contract. Path.cwd() raises if
    # the working directory has been deleted, which is exactly the kind of
    # environment problem a status check is run to diagnose.
    try:
        print(json.dumps(build_status(), ensure_ascii=False, indent=2))
    except Exception as exc:  # Emit unexpected errors under the same JSON contract too.
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(exc),
                    "hint": "Check access permissions on the .ga4 directory.",
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
