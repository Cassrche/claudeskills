"""Performs loopback login with the desktop OAuth client and saves token.json. (venv required)

Opens a browser login via google-auth-oauthlib's InstalledAppFlow, without gcloud.
Flow construction is split out into _build_flow so tests can substitute it.
"""
import argparse
import json
import sys

from ga4_common import (
    ANALYTICS_SCOPES,
    format_api_error,
    ga4_dir,
    oauth_client_path,
    token_path,
)

# The consent-screen hint is only correct for errors raised at the browser-opening
# step. Attaching this hint to errors caused by a corrupted file or a missing
# library sends the marketer digging through the wrong console settings (observed
# in practice: both a corrupted JSON file and a missing module used to get this
# same hint).
CONSENT_HINT = (
    "Check that the consent screen is set to Internal, or that this account is "
    "registered as a test user. With a personal gmail account, proceed through "
    "'Google hasn't verified this app' > Advanced > Continue."
)


class ConsentFlowError(Exception):
    """Error raised at the browser login step — this is the only case where the consent-screen hint is correct."""


class ClientFileError(Exception):
    """A problem with oauth_client.json itself. The hint carries what to fix and how."""

    def __init__(self, error, hint):
        super().__init__(error)
        self.hint = hint


def check_client_type(client_path):
    """Check that oauth_client.json is a **desktop** client.

    A web-type client is accepted by InstalledAppFlow without error (observed in
    practice), but it has no loopback redirect registered, so the flow gets all
    the way to the browser and then dies at Google with redirect_uri_mismatch. By
    that point the marketer has no way to tell what went wrong, so this check
    blocks it earlier.
    """
    try:
        data = json.loads(client_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise ClientFileError(
            f"Cannot read oauth_client.json: {e}",
            "Keep the file from your administrator exactly as-is at "
            ".ga4/oauth_client.json — don't rename it. Do not open it in an "
            "editor to try to fix it.",
        )
    if not isinstance(data, dict):
        raise ClientFileError(
            "oauth_client.json is not in a valid format (the top level is not an object).",
            "Leave the desktop app client JSON from your administrator as-is.",
        )
    if "installed" in data:
        return
    if "web" in data:
        raise ClientFileError(
            "This oauth_client.json is a 'Web application' client — "
            "this login method requires a desktop app client.",
            "Ask your administrator to recreate it in the Google Cloud console "
            "under APIs & Services -> Credentials -> 'Create OAuth client ID -> "
            "Application type: Desktop app'. (A web client will get all the way "
            "to the browser and then fail with redirect_uri_mismatch.)",
        )
    # Everything below used to collapse into one generic message that dumped
    # the raw JSON key names at a marketer. The two shapes named here are the
    # ones people actually land on, and each needs a different correction.
    if data.get("type") == "service_account" or (
        "private_key" in data and "client_email" in data
    ):
        raise ClientFileError(
            "This is a service account key, not an OAuth client — "
            "this login method signs in as you, not as a service account.",
            "Ask your administrator for the desktop app OAuth client JSON instead "
            "(Google Cloud console -> APIs & Services -> Credentials -> 'Create OAuth "
            "client ID -> Application type: Desktop app'). Service accounts are what "
            "most GA4 API tutorials use, so this is an easy one to grab by mistake — "
            "they can also work with GA4, but only after being granted access to the "
            "property, which this skill does not set up.",
        )
    if "refresh_token" in data or "token" in data:
        raise ClientFileError(
            "This looks like a login token (.ga4/token.json), not the OAuth client file.",
            "The two files are different: token.json is created by logging in, while "
            "oauth_client.json comes from your administrator. If they got swapped, put "
            "the administrator's file back at .ga4/oauth_client.json and log in again.",
        )
    raise ClientFileError(
        f"Could not find client info in oauth_client.json (keys: {sorted(data)}).",
        "Confirm with your administrator that this is the desktop app client JSON — "
        "it should have an 'installed' section at the top level.",
    )


def _build_flow(client_path):
    from google_auth_oauthlib.flow import InstalledAppFlow

    return InstalledAppFlow.from_client_secrets_file(
        str(client_path), scopes=ANALYTICS_SCOPES
    )


def run_login() -> dict:
    cp = oauth_client_path()
    if not cp.exists():
        return {
            "ok": False,
            "error": f"{cp} (oauth_client.json) does not exist.",
            "hint": (
                "Get the desktop OAuth client JSON from your administrator and "
                "place it at .ga4/oauth_client.json. See "
                "references/admin-setup-guide.md for detailed steps."
            ),
        }
    check_client_type(cp)
    flow = _build_flow(cp)
    # Using prompt="consent" guarantees a refresh_token is reissued on every login.
    # (Without it, a re-login can come back without a refresh_token, sending the
    # status check back to the login step.)
    # From here on is the actual browser login — only failures in this section
    # should get the consent-screen hint.
    try:
        creds = flow.run_local_server(port=0, prompt="consent")
    except Exception as e:  # noqa: BLE001
        raise ConsentFlowError(str(e))
    ga4_dir().mkdir(parents=True, exist_ok=True)
    token_path().write_text(creds.to_json(), encoding="utf-8")
    return {"ok": True, "saved_to": str(token_path())}


def main(argv=None):
    argparse.ArgumentParser(description="GA4 loopback login").parse_args(argv)
    try:
        result = run_login()
    except ConsentFlowError as e:
        result = {"ok": False, "error": str(e), "hint": CONSENT_HINT}
    except Exception as e:  # noqa: BLE001 - the CLI turns this into a friendly JSON error
        # An error raised before ever reaching the login screen (corrupted file,
        # wrong type, missing library, etc.). format_api_error recognizes things
        # like ModuleNotFoundError and supplies the right hint.
        result = format_api_error(e)
        hint = getattr(e, "hint", None)
        if hint is not None:
            # check_client_type already knows what to fix and how.
            result["hint"] = hint
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result.get("ok"):
        sys.exit(1)


if __name__ == "__main__":
    main()
