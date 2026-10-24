"""Shared utilities: .ga4 path resolution, config IO, token.json-based credentials, GA4 client factory.

The GA4/google-auth libraries are lazily imported only inside functions.
This lets the path/IO/token-existence-check functions work without the venv.
"""
import json
import os
import warnings
from pathlib import Path

# Suppresses the Python-version-deprecation FutureWarning that the google
# library prints to stderr, so CLI output is always clean JSON (and the
# marketer doesn't mistake a warning for an error).
warnings.filterwarnings(
    "ignore", message="You are using a Python version", category=FutureWarning
)

# analytics.readonly: read GA4 Data/Admin. spreadsheets.readonly: read the
# taxonomy sheet from Google Sheets (ga-taxonomy).
ANALYTICS_SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
]


def ga4_dir() -> Path:
    base = os.environ.get("GA4_DIR")
    return Path(base) if base else Path.cwd() / ".ga4"


def config_path() -> Path:
    return ga4_dir() / "config.json"


def oauth_client_path() -> Path:
    return ga4_dir() / "oauth_client.json"


def token_path() -> Path:
    return ga4_dir() / "token.json"


def load_config():
    p = config_path()
    if not p.exists():
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        # Degrade gracefully instead of crashing even on a corrupted config.json.
        return None
    # Parsed fine but not an object (a bare string, 12345, [], etc). Every caller
    # does cfg.get(...), so returning it as-is would blow up with AttributeError —
    # a single hand-edited config.json should never make the status check spit
    # out a stack trace.
    if not isinstance(data, dict):
        return None
    return data


def save_config(data: dict) -> None:
    ga4_dir().mkdir(parents=True, exist_ok=True)
    config_path().write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def has_stored_token() -> bool:
    """Whether token.json exists and contains a refresh_token (a lightweight stdlib-only check)."""
    p = token_path()
    if not p.exists():
        return False
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return False
    return bool(data.get("refresh_token"))


def _skills_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def sibling_script(skill: str, script: str) -> str:
    """Displayable path of a (sibling) skill's script for user-facing hints.

    Resolved from this file's location so hints stay correct wherever the
    skills are installed (.claude/skills, .agents/skills, ...). Relative to
    cwd when possible — commands are run from the project root.
    """
    p = _skills_root() / skill / "scripts" / script
    try:
        return str(p.relative_to(Path.cwd()))
    except ValueError:
        return str(p)


RELOGIN_HINT = (
    "Your token may be expired or missing a required scope. Log in again:\n"
    f"  .ga4/venv/bin/python {sibling_script('ga-auth', 'ga4_login.py')}\n"
    "Check that the consent screen includes the analytics.readonly scope."
)

PERMISSION_HINT = (
    "This GA4 property cannot be accessed. There are two possible causes:\n"
    "1. Wrong property ID — a property that does not exist raises this same error.\n"
    "   Verify property_id in .ga4/config.json, or reselect the property with the\n"
    "   ga-auth skill.\n"
    "2. No permission — in GA4 Admin > Property Access Management, confirm this\n"
    "   account has at least Viewer.\n"
    "(Neither is fixed by logging in again.)"
)

# GA4 rejects a malformed property ID differently from an inaccessible one:
# "400 Invalid property ID: G-ABC123. A numeric Property ID is required."
# That used to fall through to GENERIC_HINT, which points at authentication —
# the wrong direction entirely, since the credentials are fine and the saved
# config is what's broken. ga4_auth.py validates this at save time, but a
# config written by an older version (which saved whatever it was given) or
# hand-edited since never went through that check.
INVALID_PROPERTY_ID_HINT = (
    "The saved property ID is not a valid GA4 property ID (it must be digits only,\n"
    "e.g. 123456789). This is a problem with .ga4/config.json, not with your login.\n"
    "Reselect the property with the ga-auth skill, which validates the ID before\n"
    "saving it. If you have the GA4 web UI open, the ID is also in its URL right\n"
    "after the /p."
)

QUOTA_HINT = (
    "The API request quota has been exceeded.\n"
    "If you sent several queries at once, send them one at a time (there is a\n"
    "separate concurrent-request limit).\n"
    "If it was one large request, narrow the date range and use fewer dimensions.\n"
    "If it still fails, wait and retry — hourly and daily limits recover over time."
)

INVALID_FIELD_HINT = (
    "The request contains metric or dimension names that do not exist. Check the\n"
    "available names:\n"
    f"  .ga4/venv/bin/python {sibling_script('ga-use', 'ga4_metadata.py')} get-metadata\n"
    "Display names in the GA4 UI differ from API names (for example, 'Conversions'\n"
    "in the UI is keyEvents in the API)."
)

# Realtime's error body links to .../realtime-api-schema (confirmed live) —
# a signal already in the message, so no extra context needs threading
# through the call chain. get-metadata queries the regular Data API's
# metadata endpoint, which has a much larger field list than realtime
# supports, so pointing a realtime error at it would show the failing field
# as "valid" and send the user in circles instead of at the real fix.
REALTIME_INVALID_FIELD_HINT = (
    "Realtime reports (the ga-use skill's ga4_realtime.py) support only a small, fixed set\n"
    "of dimensions/metrics — much smaller than regular reports, and event-scoped custom\n"
    "metrics/dimensions are not supported at all. get-metadata reflects the regular Data\n"
    "API's full list, so it will show this field as valid even though realtime rejects it.\n"
    "Check the 'Valid realtime dimensions/metrics' list in that skill's\n"
    "references/analysis-guide.md instead, or switch to ga4_query.py if you don't need\n"
    "live (last-30-minutes) data."
)

COHORT_MISUSE_HINT = (
    "Cohort-prefixed metrics (cohortActiveUsers and friends) work only in cohort\n"
    "reports.\n"
    "For retention analysis, use ga4_cohort.py:\n"
    f"  echo '<cohort spec>' | .ga4/venv/bin/python {sibling_script('ga-use', 'ga4_cohort.py')}\n"
    "For an ordinary query, switch to a regular metric such as activeUsers or\n"
    "totalUsers."
)

DATE_RANGE_HINT = (
    "The date range is reversed — start_date is later than end_date.\n"
    "Swap the two values. The same rule applies to relative dates "
    "(for example, start_date '28daysAgo' with end_date 'today')."
)

GENERIC_HINT = (
    "The error message above often states the cause directly, so read it first.\n"
    "If it looks like an authentication or connection problem, run a status check:\n"
    f"  python3 {sibling_script('ga-auth', 'ga4_status.py')}"
)


# GA4 returns HTTP 500 "Internal error encountered." for a malformed expression
# metric formula — measured live: "totalRevenue / ", "/ sessions", and
# "activeUsers +" all came back as a bare 500 that reads like a server fault, so
# the marketer retries instead of fixing the formula. The 500 is not exclusively
# an expression problem (it can be a genuine transient fault), so the hint names
# the formula first — the actionable, request-side cause — then falls back to
# "retry". The matcher uses the full observed phrase, not bare "internal error",
# to avoid catching unrelated prose. Kept byte-for-byte in sync across all three
# ga4_common.py copies; the expression note points at the ga-use skill, the only
# one that builds expression metrics (same convention as REALTIME_INVALID_FIELD_HINT).
INTERNAL_ERROR_HINT = (
    "GA4 returned an internal server error (HTTP 500). In the ga-use skill this is "
    "usually a malformed expression metric (metrics[].expression) — an incomplete "
    "formula like 'totalRevenue / ' or 'activeUsers +' fails exactly this way, so "
    "check that every operator has an operand on both sides. If the request has no "
    "expression metric, treat it as a transient GA4 fault and retry in a moment."
)


# GA4 rejects some dimension/metric combinations with "The request's dimensions &
# metrics are incompatible" even though every field is valid on its own — measured
# live: an item-scope dimension (itemBrand) with pivot metric_aggregations, and
# advertiserAdClicks with activeUsers. The message sometimes names the field to drop
# ("Please remove advertiserAdClicks ...") and sometimes comes out blank
# ("Please remove  ..."), and it used to fall through to the generic hint that points
# at authentication — the wrong direction entirely. Kept in sync across all three
# ga4_common.py copies.
INCOMPATIBLE_HINT = (
    "These dimensions and metrics can't be queried together — GA4 rejects the "
    "combination even though each field is valid on its own. When the message names a "
    "field ('Please remove X ...'), drop that field. When it doesn't, the usual "
    "culprits are an item-scope dimension (itemBrand, itemName, itemCategory, ...) "
    "paired with pivot metric_aggregations or certain metrics, an advertiser metric "
    "with a non-ad dimension, or realtime's limited field set. Verify the combination "
    "in the dimensions/metrics explorer (https://ga-dev-tools.web.app/ga4/"
    "dimensions-metrics-explorer/) or split the analysis into two queries."
)


# google-api-core exceptions expose the gRPC status as the class name
# (Unauthenticated, PermissionDenied, ResourceExhausted). Google can change the
# message wording at any time — three matchers have already broken that way — but
# these type names are a structured contract and stay stable. We compare class
# name strings rather than importing the google library, because ga4_common must
# be importable without the venv.
MISSING_DEPENDENCY_HINT = (
    "A required Python library is missing. Check that you ran the script with the\n"
    "venv interpreter:\n"
    "  .ga4/venv/bin/python <script path>\n"
    "(Running with the system python3 will not find google, openpyxl, and others.)"
)


EXC_TYPE_HINTS = {
    "Unauthenticated": RELOGIN_HINT,
    "PermissionDenied": PERMISSION_HINT,
    "ResourceExhausted": QUOTA_HINT,
    "ModuleNotFoundError": MISSING_DEPENDENCY_HINT,
}


def format_api_error(exc) -> dict:
    """Converts a GA4 API exception into a marketer-friendly JSON response.

    hint is never None. Recognized errors get a specific action; even an
    unrecognized error gets at least a "check this first" pointer — so being
    absent from the whitelist never sends the marketer away empty-handed.
    Branches are ordered from specific signals to general ones, and matchers
    are written only against messages observed in practice — a guessed matcher
    either produces the wrong hint (with confident-sounding but incorrect
    wording) or turns out to be a dead branch that never fires.

    The classification order is: string -> exception type -> GENERIC. The type
    (gRPC status) is more stable than the string but much coarser, so checking
    it first would paper over finer distinctions — a scope shortage has status
    PERMISSION_DENIED, but the actual fix is to log in again (observed in
    practice); if type wins, it sends the marketer to the wrong hint ("check
    property access management").
    """
    msg = str(exc)
    low = msg.lower()
    # Do not match on the gRPC enum spelling (UNAUTHENTICATED, PERMISSION_DENIED,
    # RESOURCE_EXHAUSTED) — confirmed in practice to be a dead matcher. For gRPC
    # exceptions the enum never shows up in str(exc) (it only lives in the class
    # name), and on the REST side HttpError.__str__ also just produces
    # `<HttpError NNN when requesting URL returned "MESSAGE". Details: "...">`,
    # carrying only the prose message and an errors array — the enum appears
    # nowhere. So neither transport path can be classified this way. gRPC status
    # is already handled below by EXC_TYPE_HINTS via the type name, so do not
    # add these spellings back in.
    if (
        "insufficient authentication scopes" in low
        or "access_token_scope_insufficient" in low
        or "invalid_grant" in low
        or "invalid_scope" in low
        or "invalid authentication credentials" in low   # observed on 401
    ):
        hint = RELOGIN_HINT
    elif "invalid property id" in low:
        hint = INVALID_PROPERTY_ID_HINT
    elif (
        "does not have sufficient permissions" in low      # Data API, observed
        or "caller does not have permission" in low        # Admin API, observed
    ):
        hint = PERMISSION_HINT
    elif "quota" in low and ("exhausted" in low or "exceeded" in low):
        hint = QUOTA_HINT
    elif "cohortspec" in low:
        hint = COHORT_MISUSE_HINT
    # Full phrase, not just "start_date must be" — ga-use's ga4_cohort.py has
    # its own local validation that raises "...start_date must be in
    # YYYY-MM-DD format..." for relative dates, which used to collide with
    # this branch and show the wrong "reversed date range" hint instead.
    elif "start_date must be less than or equal to end_date" in low:
        hint = DATE_RANGE_HINT
    # Must come before the general "is not a valid metric/dimension" branch
    # below — realtime's own invalid-field errors also contain that phrase,
    # so checking the more specific realtime-api-schema signal first is what
    # makes this branch reachable at all.
    elif "realtime-api-schema" in low:
        hint = REALTIME_INVALID_FIELD_HINT
    elif (
        "is not a valid metric" in low
        or "is not a valid dimension" in low
        or ("did you mean" in low and "field" in low)
    ):
        hint = INVALID_FIELD_HINT
    # Measured live: a malformed expression-metric formula ("totalRevenue / ",
    # "activeUsers +") surfaces as a bare "500 Internal error encountered." that
    # reads like a server fault. Name the formula cause before the retry fallback.
    elif "internal error encountered" in low:
        hint = INTERNAL_ERROR_HINT
    # A valid-field-but-invalid-COMBINATION ("...dimensions & metrics are
    # incompatible"). Distinct from INVALID_FIELD (a field that doesn't exist) and
    # must not fall through to the generic auth-pointing hint.
    elif "are incompatible" in low:
        hint = INCOMPATIBLE_HINT
    else:
        # Only fall back to the exception type when the string matchers didn't
        # recognize it. Order matters: strings come first — a scope shortage
        # has gRPC status PERMISSION_DENIED, but the real fix is to log in
        # again, so checking the type first would send the wrong hint
        # (property access permissions).
        hint = EXC_TYPE_HINTS.get(type(exc).__name__, GENERIC_HINT)
    return {"ok": False, "error": msg, "hint": hint}


def load_credentials():
    """Loads Credentials from token.json, refreshing and re-saving it on expiry."""
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    tp = token_path()
    if not tp.exists():
        raise RuntimeError(
            "token.json is missing. Log in first with ga4_login.py."
        )
    creds = Credentials.from_authorized_user_file(str(tp), ANALYTICS_SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            tp.write_text(creds.to_json(), encoding="utf-8")
        else:
            raise RuntimeError(
                "The token is invalid. Log in again with ga4_login.py."
            )
    return creds


def get_data_client():
    from google.analytics.data_v1beta import BetaAnalyticsDataClient

    return BetaAnalyticsDataClient(credentials=load_credentials())


def get_admin_client():
    from google.analytics.admin_v1beta import AnalyticsAdminServiceClient

    return AnalyticsAdminServiceClient(credentials=load_credentials())
