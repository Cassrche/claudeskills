"""Run the GA4 Data API runReport (cohort). (requires venv)

Cohort (retention) report. Extended JSON spec (stdin or --input) — two input paths:

Shorthand form (single cohort):
{
  "granularity": "WEEKLY",              // DAILY|WEEKLY|MONTHLY
  "date_range": {"start_date": "2026-06-01", "end_date": "2026-06-28"},
  "offsets": {"start": 0, "end": 4},
  "dimension": "firstSessionDate",       // cohort-defining dimension (default firstSessionDate)
  "accumulate": false,                   // must stay false — true only works via runPivotReport,
                                          // which this script does not use (rejected locally)
  "metrics": ["cohortActiveUsers"],      // auto-filled if omitted
  "dimensions": [], ...
}

Full-control form (multiple cohorts):
{
  "cohort_spec": {"cohorts": [...], "cohorts_range": {...}, "cohort_report_settings": {...}},
  "metrics": [...], "dimensions": [], ...
}

The cohort/cohortNthX dimensions and default metric are auto-injected.
Top-level date_ranges is not allowed (cohorts use their own date_range).
Filtering, ordering, response shaping, and CLI live in the shared ga4_reporting module.
"""
import re

from ga4_common import get_data_client
from ga4_reporting import (
    as_int,
    build_filter_expression,
    as_positive_int,
    require_string_list,
    build_order_bys,
    check_spec_keys,
    require_name_string,
    run_cli,
    shape_report_response,
)

ABSOLUTE_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")

# Keys each nested cohort object actually reads, for the unknown-key checks.
# Silently ignoring one here means the cohort is defined differently than
# asked (a dropped `dimension` silently falls back to firstSessionDate).
COHORT_ITEM_KEYS = {"name", "dimension", "date_range"}
COHORTS_RANGE_KEYS = {"granularity", "start_offset", "end_offset"}
COHORT_DATE_RANGE_KEYS = {"start_date", "end_date"}
OFFSETS_KEYS = {"start", "end"}
COHORT_SETTINGS_KEYS = {"accumulate"}

GRANULARITY_NTH = {
    "DAILY": "cohortNthDay",
    "WEEKLY": "cohortNthWeek",
    "MONTHLY": "cohortNthMonth",
}
ALL_NTH = set(GRANULARITY_NTH.values())
DEFAULT_DIMENSION = "firstSessionDate"
DEFAULT_METRIC = "cohortActiveUsers"

# GA4 rejects cohort names starting with "cohort_" ("Names cannot begin with
# cohort_"). The name shows up as-is in the response's cohort column, so keep
# the default human-readable too.
FORBIDDEN_NAME_PREFIX = "cohort_"
DEFAULT_COHORT_NAME = "Cohort"


def _check_cohort_name(name):
    """Catch a name GA4 would reject locally instead of via an API 400."""
    if str(name).startswith(FORBIDDEN_NAME_PREFIX):
        raise ValueError(
            f"Cohort name cannot start with {FORBIDDEN_NAME_PREFIX!r} (GA4 constraint): {name!r}. "
            "Use a recognizable name instead, e.g. 'June signups'."
        )
    return name


# ---- assembly helpers -------------------------------------------------------

def _granularity_enum(name):
    from google.analytics.data_v1beta.types import CohortsRange

    if name not in GRANULARITY_NTH:
        raise ValueError(
            f"Unknown granularity: {name!r}. Must be one of DAILY, WEEKLY, MONTHLY."
        )
    return CohortsRange.Granularity[name]


def _date_range(dr, where):
    from google.analytics.data_v1beta.types import DateRange

    if not isinstance(dr, dict):
        raise ValueError(f"{where} must be an object: {dr!r}")
    # The shared build_date_ranges validates its keys; this cohort-only date
    # object was the inconsistent one left over (found by mechanically
    # enumerating dict-reading sites).
    check_spec_keys(dr, COHORT_DATE_RANGE_KEYS, script=where)
    if "start_date" not in dr or "end_date" not in dr:
        raise ValueError(f"{where} requires start_date and end_date: {dr!r}")
    # Other reports accept relative dates like "28daysAgo"/"today", but cohort
    # does not. GA4's own error ("the cohort start date format is not
    # correct!") doesn't say what's wrong, so we explain the reason and the
    # fix before the call.
    for key in ("start_date", "end_date"):
        value = str(dr[key])
        if not ABSOLUTE_DATE.fullmatch(value):
            raise ValueError(
                f"Cohort's {where}.{key} must be in YYYY-MM-DD format (GA4 constraint): {value!r}. "
                "Relative dates like '28daysAgo'/'today' cannot be used for cohorts — "
                "use an actual date instead (e.g. 2026-06-01)."
            )
    return DateRange(start_date=dr["start_date"], end_date=dr["end_date"])


def _check_accumulate(value, where):
    """accumulate: true is a real GA4 CohortReportSettings field, but it only
    works with runPivotReport — this script always issues a plain runReport
    (see run_cohort_report). Confirmed live: it is rejected 100% of the time,
    for any other input, with "Accumulate is not supported in report request;
    use pivot report request." Catch it locally with the reason instead of
    letting every attempt hit the API for an opaque late error.
    """
    if value:
        raise ValueError(
            f"{where}: accumulate=true is not supported here (GA4 constraint) — it only works "
            "with runPivotReport, and this script always uses runReport. Leave accumulate "
            "false/omitted and add up cohortActiveUsers across the offsets you care about "
            "yourself if you need a cumulative total."
        )


# Offset 0 counts in the report's granularity: days for DAILY, weeks for
# WEEKLY, months for MONTHLY. The rejection messages name the unit so a
# DAILY/MONTHLY report doesn't tell the user their *week* is wrong.
_GRANULARITY_UNIT = {"DAILY": "day", "WEEKLY": "week", "MONTHLY": "month"}


def _check_offsets_window(start, end, where, granularity):
    """Reject a cohort observation window that can't match any period.

    Offset 0 is the acquisition period (day/week/month per the granularity), so
    a negative offset points before the cohort existed — there is nothing to
    observe there (measured live: start=-2 still returned rows labeled from
    offset 0, silently shifted). An inverted window (start > end) matches no
    period at all and GA4 answers it with zero rows and no error (measured
    live), which a marketer then reads as "retention fell to nothing" — the
    same silent-inversion trap as a start_date after an end_date, except GA4
    does not even raise a 400 here. Catch both locally so the mistake is named
    instead of reported as a finding. start == end is valid (one period).
    """
    unit = _GRANULARITY_UNIT.get(str(granularity).upper(), "period")
    if start < 0 or end < 0:
        raise ValueError(
            f"{where} can't be negative (got start={start}, end={end}): {unit} 0 is "
            f"the cohort's acquisition {unit}, so there is no earlier {unit} to observe."
        )
    if start > end:
        raise ValueError(
            f"{where} start must be <= end (got start={start}, end={end}): an inverted "
            f"window matches no {unit}, and GA4 returns zero rows with no error — which "
            "reads as 'no retention'. Swap the two values."
        )


def _cohort_spec_from_shorthand(spec):
    from google.analytics.data_v1beta.types import (
        Cohort,
        CohortReportSettings,
        CohortsRange,
        CohortSpec,
    )

    granularity = spec.get("granularity")
    if not granularity:
        raise ValueError("granularity is required: one of DAILY, WEEKLY, MONTHLY.")
    gran_enum = _granularity_enum(granularity)
    if "date_range" not in spec:
        raise ValueError("The shorthand form requires date_range (the cohort acquisition period).")
    offsets = spec.get("offsets")
    if not isinstance(offsets, dict):
        raise ValueError('offsets requires start and end: e.g. {"start":0,"end":4}.')
    check_spec_keys(offsets, OFFSETS_KEYS, script="offsets")
    if "start" not in offsets or "end" not in offsets:
        raise ValueError('offsets requires start and end: e.g. {"start":0,"end":4}.')
    cohort = Cohort(
        name=_check_cohort_name(spec.get("name") or DEFAULT_COHORT_NAME),
        dimension=require_name_string(
            spec.get("dimension", DEFAULT_DIMENSION),
            "dimension",
            '"dimension": "firstSessionDate" — a plain name string, not an object.',
        ),
        date_range=_date_range(spec["date_range"], "date_range"),
    )
    start_offset = as_int(offsets["start"], "offsets' start")
    end_offset = as_int(offsets["end"], "offsets' end")
    _check_offsets_window(start_offset, end_offset, "offsets", granularity)
    cohorts_range = CohortsRange(
        granularity=gran_enum,
        start_offset=start_offset,
        end_offset=end_offset,
    )
    _check_accumulate(spec.get("accumulate"), "accumulate")
    # Always False past _check_accumulate — stated plainly rather than read
    # back from the spec, which would imply the value still varies.
    settings = CohortReportSettings(accumulate=False)
    cohort_spec = CohortSpec(
        cohorts=[cohort],
        cohorts_range=cohorts_range,
        cohort_report_settings=settings,
    )
    return cohort_spec, granularity


def _cohort_spec_from_full(cs):
    from google.analytics.data_v1beta.types import (
        Cohort,
        CohortReportSettings,
        CohortsRange,
        CohortSpec,
    )

    if not isinstance(cs, dict):
        raise ValueError(f"cohort_spec must be an object: {cs!r}")
    cohorts = cs.get("cohorts")
    # Check the list type first: a non-list value like a dict gets an accurate
    # message (distinct from an empty list).
    if cohorts is not None and not isinstance(cohorts, list):
        raise ValueError(f"cohort_spec.cohorts must be a list: {cohorts!r}")
    if not cohorts:
        raise ValueError("cohort_spec.cohorts is required: at least one cohort.")
    cr = cs.get("cohorts_range")
    if cr is None:
        raise ValueError("cohort_spec.cohorts_range is required.")
    if not isinstance(cr, dict):
        raise ValueError(f"cohort_spec.cohorts_range must be an object: {cr!r}")
    check_spec_keys(cr, COHORTS_RANGE_KEYS, script="cohort_spec.cohorts_range")
    granularity = cr.get("granularity")
    if not granularity:
        raise ValueError(
            "cohort_spec.cohorts_range.granularity is required: one of DAILY, WEEKLY, MONTHLY."
        )
    gran_enum = _granularity_enum(granularity)
    if "start_offset" not in cr or "end_offset" not in cr:
        raise ValueError("cohort_spec.cohorts_range requires start_offset and end_offset.")

    built = []
    for c in cohorts:
        if not isinstance(c, dict):
            raise ValueError(f"cohort item must be an object: {c!r}")
        check_spec_keys(c, COHORT_ITEM_KEYS, script="cohort item")
        if "date_range" not in c:
            raise ValueError(f"cohort requires date_range: {c!r}")
        built.append(Cohort(
            name=_check_cohort_name(c.get("name", "")),
            dimension=require_name_string(
                c.get("dimension", DEFAULT_DIMENSION),
                "cohort item's dimension",
                '"dimension": "firstSessionDate" — a plain name string, not an object.',
            ),
            date_range=_date_range(c["date_range"], "cohort.date_range"),
        ))
    start_offset = as_int(cr["start_offset"], "cohorts_range's start_offset")
    end_offset = as_int(cr["end_offset"], "cohorts_range's end_offset")
    _check_offsets_window(start_offset, end_offset, "cohorts_range", granularity)
    cohorts_range = CohortsRange(
        granularity=gran_enum,
        start_offset=start_offset,
        end_offset=end_offset,
    )
    kwargs = {"cohorts": built, "cohorts_range": cohorts_range}
    settings = cs.get("cohort_report_settings")
    if settings is not None:
        if not isinstance(settings, dict):
            raise ValueError(f"cohort_report_settings must be an object: {settings!r}")
        check_spec_keys(settings, COHORT_SETTINGS_KEYS, script="cohort_report_settings")
        _check_accumulate(settings.get("accumulate"), "cohort_report_settings.accumulate")
        # Always False past the check above (see the shorthand path's note).
        kwargs["cohort_report_settings"] = CohortReportSettings(accumulate=False)
    return CohortSpec(**kwargs), granularity


# ---- request assembly ------------------------------------------------------

# Shorthand-only keys (meaningless when cohort_spec is used).
SHORTHAND_KEYS = {"granularity", "offsets", "date_range", "name", "dimension", "accumulate"}
KNOWN_SPEC_KEYS = SHORTHAND_KEYS | {
    "cohort_spec", "metrics", "dimensions", "dimension_filter", "metric_filter",
    "order_bys", "limit", "offset",
}
UNSUPPORTED_KEY_REASONS = {
    "date_ranges": "Cohort does not use date_ranges — use date_range for the shorthand form, "
                   "or each cohort.date_range under cohort_spec for the full-control form.",
    "cohort_report_settings": "Put accumulate directly in the shorthand form, "
                              "or under cohort_spec.cohort_report_settings for the full-control form.",
}


def build_cohort_request(property_id, spec):
    from google.analytics.data_v1beta.types import (
        Dimension,
        Metric,
        RunReportRequest,
    )

    check_spec_keys(spec, KNOWN_SPEC_KEYS, UNSUPPORTED_KEY_REASONS, "ga4_cohort.py")
    # Combining cohort_spec (full-control) with shorthand keys silently ignores
    # the shorthand keys.
    if "cohort_spec" in spec:
        conflicting = sorted(SHORTHAND_KEYS & set(spec))
        if conflicting:
            raise ValueError(
                f"cohort_spec (full-control) and shorthand keys cannot be combined. "
                f"When cohort_spec is given, shorthand keys are ignored. Conflicting keys: {conflicting}. "
                "Keep only one of the two."
            )

    if "cohort_spec" in spec:
        cohort_spec, granularity = _cohort_spec_from_full(spec["cohort_spec"])
    else:
        cohort_spec, granularity = _cohort_spec_from_shorthand(spec)
    nth = GRANULARITY_NTH[granularity]

    # Default metric + cohort-prefix validation
    metrics = require_string_list(spec.get("metrics"), "metrics") or [DEFAULT_METRIC]
    bad = [m for m in metrics if not m.startswith("cohort")]
    if bad:
        raise ValueError(
            f"Cohort reports only accept cohort metrics. Invalid metrics: {bad}. "
            "Example: cohortActiveUsers, cohortTotalUsers."
        )

    # Auto-inject dimension + validate a mismatched Nth
    dimensions = require_string_list(spec.get("dimensions"), "dimensions")
    wrong_nth = [d for d in dimensions if d in ALL_NTH and d != nth]
    if wrong_nth:
        raise ValueError(
            f"granularity={granularity} requires the {nth} dimension. Mismatched dimensions: {wrong_nth}."
        )
    if nth not in dimensions:
        dimensions.insert(0, nth)
    if "cohort" not in dimensions:
        dimensions.insert(0, "cohort")

    kwargs = {
        "property": f"properties/{property_id}",
        "dimensions": [Dimension(name=d) for d in dimensions],
        "metrics": [Metric(name=m) for m in metrics],
        "cohort_spec": cohort_spec,
        "limit": as_positive_int(spec.get("limit", 250), "limit"),
        "offset": as_int(spec.get("offset", 0), "offset"),
    }
    if spec.get("dimension_filter"):
        kwargs["dimension_filter"] = build_filter_expression(spec["dimension_filter"], "dimension")
    if spec.get("metric_filter"):
        kwargs["metric_filter"] = build_filter_expression(spec["metric_filter"], "metric")
    order_bys = build_order_bys(spec.get("order_bys"))
    if order_bys:
        kwargs["order_bys"] = order_bys
    return RunReportRequest(**kwargs)


# ---- execution --------------------------------------------------------------

# A cohort report always carries the auto-injected cohort/cohortNthWeek
# dimensions, so the generic "query again with no dimensions" remedy is
# impossible here. Give cohort-accurate guidance instead: cohortTotalUsers is
# the fixed cohort size repeated on every row, and summing cohortActiveUsers
# across offsets is the documented way to get a cumulative figure (SKILL.md),
# not an error — it just counts a user active in several offsets more than once.
_COHORT_NON_ADDITIVE_REMEDY = (
    "In a cohort these are per-offset values: cohortTotalUsers is the fixed size of "
    "each cohort — identical across that cohort's offset rows (and differs between "
    "cohorts when several are compared), so read it per cohort rather than summing; "
    "summing cohortActiveUsers across offsets gives cumulative return activity (a "
    "user active in several offsets is counted in each), not a distinct-user total. "
    "There is no dimension-free cohort report to fall back to."
)


def run_cohort_report(property_id, spec, client=None):
    if client is None:
        client = get_data_client()
    resp = client.run_report(build_cohort_request(property_id, spec))
    return shape_report_response(resp, non_additive_remedy=_COHORT_NON_ADDITIVE_REMEDY)


# ---- CLI ----------------------------------------------------------------

def main(argv=None):
    # diagnose_compatibility is on because a cohort report *is* a v1beta
    # runReport, so if GA4 ever raises the incompatibility error here the
    # diagnosis is correct by construction (it asks GA4, it doesn't guess).
    # Verified reachable for query and pivot; NOT verified for cohort — this
    # script's own "cohort reports only accept cohort metrics" check rejects the
    # mixed-metric case before the API sees it, and mixing item/campaign/channel
    # dimensions into a real cohortSpec was tried and simply succeeds. So treat
    # this as unexercised rather than confirmed: if it needs changing later,
    # find a failing cohort request first instead of reasoning about it.
    run_cli(run_cohort_report, "GA4 Data API runReport(cohort)", argv, diagnose_compatibility=True)


if __name__ == "__main__":
    main()
