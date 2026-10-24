"""Saves the selected GA4 property to .ga4/config.json. (stdlib only)

Login itself is handled by ga4_login.py; this script persists the result of
the property selection.
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone

from ga4_common import save_config, sibling_script

# A GA4 property ID is digits only (e.g. 123456789). Things marketers commonly
# confuse it with:
#  - a measurement ID `G-XXXXXXXXXX` — that's for web streams and doesn't work
#    with the Data API
#  - `properties/123456789` — the API path form. Only the digits are needed.
# Saving it as-is surfaces as a confusing API error much later, at analysis
# time, making the root cause hard to find.
NUMERIC_ID = re.compile(r"\d+")
MIN_PROPERTY_ID_DIGITS = 6

# Keeps the hint from being empty even if a ValueError that skipped _with_hint
# slips through.
# The path is derived, not spelled out: CLAUDE.md's path-portability rule exists
# because these skills are installed outside .claude/skills too. These two
# sentences were each written out three to five times across the hints below,
# which meant a wording fix had to find every copy — and the tests only assert
# `"list-properties" in hint`, so missing one would not have failed anything.
_LIST_PROPERTIES = (
    "Get the list of accessible properties with "
    f"{sibling_script('ga-auth', 'ga4_admin.py')} list-properties and choose from there."
)
_URL_TIP = (
    "If you are looking at the GA4 web UI, the ID is also in its URL, right after "
    "the /p (…/analytics/web/#/p123456789/…) — you can paste that whole URL here."
)
FALLBACK_HINT = f"{_LIST_PROPERTIES} Then try again."
PROPERTIES_PREFIX = "properties/"

# The GA4 web UI puts the property ID straight into its own URL as `p<digits>`
# (…/analytics/web/#/p123456789/reports/…). Asked "what's your property ID?",
# pasting that URL is the single most natural thing a marketer does — the
# number is right there in what they pasted, so rejecting it with a generic
# "must be numeric" is a failure to read available input, not a real
# ambiguity. Matches the bare `p123456789` form too.
# The `w\d+` alternative is not an edge case — it is the form GA4 actually
# produces. Navigating through the account/workspace picker yields
# `#/a1234567w7654321p123456789/reports/…`, where the `p` is preceded by a digit,
# so requiring `/` or `#` in front of it matched only the shorter
# `#/p123456789/…` variant. Reading a pasted URL is the entire point of this
# pattern, and it worked on one of the two URLs a marketer can be looking at.
GA4_URL_PROPERTY = re.compile(r"(?:^|[/#]|w\d+)p(\d+)(?:[/?#]|$)")

# A value copied out of a spreadsheet cell formatted as a number
# ("123,456,789"). Matched as a WHOLE grouped number rather than by stripping
# every separator and re-testing: caught in review, the strip-then-test form
# silently concatenated two pasted IDs ("123456789\n987654321" ->
# "123456789987654321") into one bogus value that failed much later as
# "400 Invalid property ID" — the exact late failure this validation exists
# to prevent. Copying two cells out of a property list is a real thing to do.
_GROUPED_NUMBER = re.compile(r"^\d{1,3}(?:[,\s]\d{3})+$")

# Sanity bound on the grouped form only. "123,456,789 987,654,321" — two cells
# pasted on one line — is a valid group chain by the pattern above, so the
# pattern alone can't tell it from one number. Real GA4 property IDs run 9-10
# digits; two of them concatenated is 18+. This is a plausibility check, not a
# spec: a plain numeric ID never goes through it, so a future longer ID is
# unaffected.
_MAX_GROUPED_DIGITS = 15

# Other Google product IDs a marketer may reach for. Each gets its own
# sentence naming what they actually pasted, rather than the generic
# "must be numeric" — same treatment the G- measurement ID already had.
OTHER_ID_FORMS = (
    ("UA-", "a Universal Analytics property ID (the pre-GA4 product)"),
    ("GTM-", "a Google Tag Manager container ID"),
    ("AW-", "a Google Ads conversion ID"),
    ("DC-", "a Campaign Manager advertiser ID"),
)


def _with_hint(error, hint):
    """A ValueError that carries both error and hint. Follows this repo's shared convention of a hint attribute."""
    exc = ValueError(error)
    exc.hint = hint
    return exc


def normalize_property_id(raw):
    """Validates a property ID and returns it as a digit string. Raises ValueError if unrecognized."""
    value = str(raw).strip()
    if NUMERIC_ID.fullmatch(value):
        # A lower bound, because the whole point of validating here is to turn a
        # late "400 Invalid property ID" at analysis time into an immediate,
        # readable message. `\d+` alone accepted "0" and "1" — what a truncated
        # paste or a row number from the property list looks like. Six is well
        # under the 9-10 digits real IDs use, so a shorter future ID would still
        # pass; this only catches values that cannot be a property ID at all.
        if len(value) < MIN_PROPERTY_ID_DIGITS:
            raise _with_hint(
                f"{value!r} is too short to be a GA4 property ID (they run 9-10 digits).",
                f"{_LIST_PROPERTIES} {_URL_TIP}",
            )
        return value
    if value.startswith(PROPERTIES_PREFIX):
        rest = value[len(PROPERTIES_PREFIX):]
        if NUMERIC_ID.fullmatch(rest):
            return rest          # 'properties/123' is the API path form — accept it quietly
    # A pasted GA4 UI URL (or the bare p<digits> from it) carries the ID
    # unambiguously — read it rather than making the user hunt for it.
    m = GA4_URL_PROPERTY.search(value)
    if m:
        return m.group(1)
    # A spreadsheet-formatted number: unambiguous once the separators are gone.
    if _GROUPED_NUMBER.fullmatch(value):
        joined = re.sub(r"[,\s]", "", value)
        if len(joined) <= _MAX_GROUPED_DIGITS:
            return joined
    # error says what's wrong, hint says what to do — never repeat the same sentence twice.
    if value.upper().startswith("G-"):
        raise _with_hint(
            f"{value!r} is a measurement ID (for web streams) — analysis needs a numeric property ID.",
            f"{_LIST_PROPERTIES} You can also check under GA4 Admin -> Property Settings.",
        )
    upper = value.upper()
    for prefix, description in OTHER_ID_FORMS:
        if upper.startswith(prefix):
            raise _with_hint(
                f"{value!r} is {description} — analysis needs a GA4 numeric property ID.",
                f"{_LIST_PROPERTIES} You can also check under GA4 Admin -> Property Settings.",
            )
    raise _with_hint(
        f"A property ID must be numeric (e.g. 123456789): {value!r}",
        f"{_LIST_PROPERTIES} {_URL_TIP}",
    )


def parse_retention_months(raw):
    """Retention months as an int, or None when it was not supplied.

    An empty string means "get-property did not report it", which is the same as
    not passing the flag — stored as None so it reads as "not known". Anything
    else that is not a number raises with a hint rather than letting argparse
    print a usage dump.
    """
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return None
    try:
        return int(str(raw).strip())
    except ValueError:
        raise _with_hint(
            f"--retention-months must be a number of months: {raw!r}",
            "Read it from "
            f"{sibling_script('ga-auth', 'ga4_admin.py')} get-property "
            "(event_data_retention_months). If that command did not report it, "
            "leave the flag out entirely — the value is then stored as \"not "
            "known\", which is correct.",
        )


# The literal that records "the lookup succeeded and there are no data streams".
# It has to be a word rather than an empty string: an empty --platforms is the
# natural slip when get-property reported nothing, and that must read as "not
# known", never as the confirmed answer "this property has no streams".
NO_PLATFORMS = "none"


# GA4's own spelling, keyed by its lowercase form. The vocabulary is not
# internally consistent — `web` is lowercase while `iOS` and `Android` start
# with a capital — and this flag is retyped from get-property's output by hand,
# which is exactly where that inconsistency gets flattened. Nothing downstream
# rejects the flattened form: `ios` builds a `platform` filter that matches
# nothing and reports no error, and `Web` makes the "platforms is exactly
# ["web"]" test in the SKILL.md prose false, so a web property gets told its
# page_view will never arrive. Same argument as the empty-string case in
# save_property below — normalising here means the promise holds regardless of
# how the caller behaves.
CANONICAL_PLATFORMS = {
    "web": "web",
    "ios": "iOS",
    "android": "Android",
    "unknown": "unknown",
}


def parse_platforms(raw):
    """The platform list to store, or None when it was not supplied.

    Returns [] only for the explicit NO_PLATFORMS literal. Anything blank —
    including a lone comma — is None, i.e. "not known", matching how
    currency_code and time_zone behave when the lookup did not report them.

    Known values are mapped onto GA4's own casing; anything else passes through
    unchanged. Rejecting an unrecognised value would be worse than storing it:
    GA4 can add a stream type, and this script is stdlib-only and cannot check.
    """
    if raw is None or not str(raw).strip():
        return None
    if str(raw).strip().lower() == NO_PLATFORMS:
        return []
    parts = [p.strip() for p in str(raw).split(",") if p.strip()]
    return [CANONICAL_PLATFORMS.get(p.lower(), p) for p in parts] or None


def save_property(property_id, name=None, account=None,
                  currency_code=None, time_zone=None,
                  event_data_retention_months=None, platforms=None) -> dict:
    """Persists the property selection, including its currency and timezone.

    currency_code and time_zone come from ga4_admin.py get-property (this script
    is stdlib-only and cannot call the API itself, hence passing them in). They
    are stored because neither can be inferred and both change what an answer
    means: a property measured here runs on Asia/Seoul time and reports revenue
    in USD, so reading it as won is out by roughly 1300x. Report responses carry
    them too, but only for the runReport family — realtime responses have no
    metadata block, so without this the currency would be unknowable there.

    Written as None when not supplied rather than omitted, so a config saved by
    an older version and one saved without the lookup look the same to readers:
    absent means "not known", never "no currency".

    platforms is which platforms the property collects from — web, iOS, Android,
    in GA4's own spelling. It is context rather than arithmetic: it does not
    change what a number means, it changes which events and dimensions can exist
    at all. An app-only property never sends page_view, so a taxonomy defining
    it is not a missing implementation and no lookback window will find it.
    None means "not known" and [] means "confirmed no streams"; the timestamp
    travels with the list so a reader can tell how old the answer is.
    """
    now = datetime.now(timezone.utc).isoformat()
    cfg = {
        "property_id": normalize_property_id(property_id),
        "property_name": name,
        "account": account,
        # `or None` is the contract, not tidiness. get-property omits these keys
        # when the Admin lookup fails, so the caller is told to drop the flag —
        # but passing an empty string instead is the natural slip, and an empty
        # currency_code is worse than a missing one: it is a value, so a reader
        # takes it as "this property reports in no currency" rather than "not
        # known". Normalising here means the promise holds regardless of how the
        # caller behaves.
        "currency_code": currency_code or None,
        "time_zone": time_zone or None,
        # Only a funnel is limited by this, but a funnel is where its absence
        # hurts: beyond retention runFunnelReport returns zero rows with no
        # error, while runReport over the same period answers normally.
        "event_data_retention_months": event_data_retention_months,
        "platforms": platforms,
        # Only stamped when there is something to stamp. A null list carrying a
        # timestamp would claim the absence was confirmed at that moment, which
        # is the opposite of what None means here.
        "platforms_checked_at": None if platforms is None else now,
        "saved_at": now,
    }
    save_config(cfg)
    return cfg


def main(argv=None):
    ap = argparse.ArgumentParser(description="Save GA4 property")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sp = sub.add_parser("save-property", help="Save the property ID")
    sp.add_argument("property_id")
    sp.add_argument("--name")
    sp.add_argument("--account")
    # Both come from ga4_admin.py get-property. See save_property's docstring for
    # why they are worth a second call at selection time.
    sp.add_argument("--currency", help="Reporting currency, e.g. USD")
    sp.add_argument("--time-zone", dest="time_zone", help="Property timezone, e.g. Asia/Seoul")
    # Deliberately not type=int. argparse rejects a bad value by printing a
    # usage dump to stderr and exiting 2 — no JSON at all, which is the one
    # output shape this project promises never to produce. And the bad value is
    # easy to reach: SKILL.md shows this flag in the command, while get-property
    # omits the key whenever the retention lookup fails, so the obvious slip is
    # passing an empty string. Parsed below into the usual {"ok": false, hint}.
    sp.add_argument("--retention-months", dest="retention_months",
                    help="Event data retention in months (2/14/26/38/50)")
    sp.add_argument("--platforms",
                    help='Platforms from get-property, comma separated '
                         f'(e.g. "iOS,Android"). Pass "{NO_PLATFORMS}" if it '
                         'reported no data streams.')
    args = ap.parse_args(argv)
    if args.cmd == "save-property":
        try:
            cfg = save_property(args.property_id, args.name, args.account,
                                args.currency, args.time_zone,
                                parse_retention_months(args.retention_months),
                                parse_platforms(args.platforms))
        except ValueError as e:
            # Always a single clean JSON blob for the marketer — never show a
            # stack trace. hint must never be an empty string. An empty hint
            # occupies the "what to do next" slot while saying nothing, which
            # defeats the whole reason this project has a hint field.
            print(json.dumps({
                "ok": False,
                "error": str(e),
                "hint": getattr(e, "hint", None) or FALLBACK_HINT,
            }, ensure_ascii=False, indent=2))
            sys.exit(1)
        except OSError as e:
            print(json.dumps({
                "ok": False,
                "error": f"Failed to save the config: {e}",
                "hint": "Check that the .ga4 directory is writable.",
            }, ensure_ascii=False, indent=2))
            sys.exit(1)
        print(json.dumps(cfg, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
