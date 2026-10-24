# Analysis Guide (Data API runReport)

`{SKILLS_DIR}` = the directory these ga skills are installed in (the parent of this skill's
directory; `.claude/skills` in a Claude Code project). Substitute the actual path.

## Request spec format
`ga4_query.py` takes the following JSON via stdin or a `--input` file. All fields are optional; omitted ones use their default behavior.

```json
{
  "dimensions": ["eventName", "date"],
  "metrics": ["eventCount", "totalUsers"],
  "date_ranges": [{"start_date": "7daysAgo", "end_date": "yesterday"}],
  "dimension_filter": { },
  "metric_filter": { },
  "order_bys": [ ],
  "limit": 100,
  "offset": 0
}
```
> **The last two days are still being processed.** Google states GA4 processing "can take
> 24-48 hours. During that time, data in your reports may change"
> ([data freshness](https://support.google.com/analytics/answer/11198161)) — daily data
> typically settles around 18 hours, intraday runs 2-6 hours behind, and none of it is an SLA.
> A period ending at `today` or `yesterday` is therefore a **moving figure**, and the response
> carries `unsettled_ranges` saying so. Never report a dip in the most recent day(s) as a real
> decline: say the data is still settling, or end the period at `2daysAgo` for a number that
> will hold. (Only the relative forms are judged — deciding whether an absolute date is
> "yesterday" would need today's date in the property's timezone.)

> **Comparing two periods: make them the same length, and don't end at `today`.**
> `7daysAgo..today` is **8** days (both ends inclusive) while `14daysAgo..8daysAgo` is 7 — the
> obvious-looking pair compares 8 days against 7, so any "up/down X%" carries a spare day.
> Ending at `today` adds a second skew, since today is still in progress. Use `yesterday` as the
> end of the recent period. The response reports `date_range_lengths` and warns when the periods
> differ.
>
> **And with a `date` dimension, 2+ ranges return a cross product.** GA4 gives every date against
> every range, filling `0` where the date is outside that range — measured on a live property,
> 57 rows per range for 29 and 28 real days. Those zeros mean "not in this period", not "no
> activity": averaging over the returned rows landed about **half** the true daily figure. Average
> over the days belonging to each range, or drop the `date` dimension when you only need totals.

If `date_ranges` is omitted, the last 7 days **ending yesterday** are used — GA4's own standard reports end their default range at yesterday for the same reason (see the processing note above). **With 2 or more entries, GA4 automatically attaches a `dateRange` dimension to the response** (`date_range_0`, `date_range_1`), comparing results row-by-row per range. Warning: **never put `dateRange` in `dimensions` yourself** — it's only ever attached automatically, and adding it explicitly causes GA4 to return a 400 ("does not need to be listed in the Dimensions"). If you do, this is caught and explained locally before the API call.

## Top-level keys per script (important)

The filter/order **syntax** is the same across all five scripts, but **which keys can go at the top level differs.**
A key not in the table below is caught as an error before the API call, with guidance on where it belongs
(previously it was silently ignored, so plausible-looking numbers came back with the requested period or filter quietly missing).

| Key | query | realtime | pivot | cohort | funnel |
|---|:---:|:---:|:---:|:---:|:---:|
| `dimensions` / `metrics` | Yes | Yes | Yes | Yes | No |
| `date_ranges` | Yes | No — no configurable period | Yes | No — uses `date_range` | Yes |
| `dimension_filter` / `metric_filter` | Yes | Yes | Yes | Yes | No — per-step only |
| `order_bys` | Yes | Yes | No — `pivots[].order_bys` | Yes | No |
| `limit` | Yes | Yes | No — `pivots[].limit` | Yes | Yes |
| `offset` | Yes | No | No — `pivots[].offset` | Yes | No |
| Dedicated key | — | `minute_ranges` | `pivots` | `cohort_spec` or shorthand | `steps`, etc. |

**Warning: only snake_case is read.** The official GA4 REST docs use camelCase (`dateRanges`,
`dimensionFilter`, `orderBys`), but these scripts only recognize snake_case. Using camelCase is
caught as an error with the correct name to use instead — fix it per the guidance and retry.

This applies **inside nested objects too**, not just at the top level: `order_bys[]` entries,
filter conditions, `date_ranges[]`, `pivots[]`, `steps[]`, `funnel_breakdown`, `minute_ranges[]`,
the `metrics[]` object form, the leaves inside a funnel step's `filter_expression`, and every
cohort sub-object (`cohorts[]`, `cohorts_range`, `offsets`, `date_range`, `cohort_report_settings`)
all reject unknown/camelCase keys the same way. That matters because a silently
ignored nested key doesn't merely drop a detail — it can invert the answer. `{"metric": "...",
"descending": true}` in `order_bys` used to sort **ascending** (since `desc` defaults to false),
so a "top 3 by revenue" query returned the three *worst* performers and looked completely normal.

**Cohort dates must be absolute only.** Unlike other reports, which accept relative dates like
`28daysAgo`/`today`, cohort's `date_range` cannot (GA4 constraint). Use `2026-06-01`-style dates.
Its `date_range` also takes a **narrower key set** than the `date_ranges[]` entries elsewhere:
`start_date` and `end_date` only, no `name` — a cohort's label belongs in `cohort.name`.

## Metrics you must not sum across rows (important)

**User and session counts are deduplicated values, so summing rows split by dimension inflates
them beyond the true total.** A user spanning multiple days/countries is counted once per row.
Measured on a live property over one month, summing daily rows against the true monthly total:

| Metric | Summed across daily rows vs. true total |
|---|---|
| `activeUsers` | **+13%** — the inflation is large enough to change a conclusion |
| `sessions` | +0.7% — small here, but not zero, and it grows with the date range |
| `eventCount` | exact match — event counts are additive |

> **Round currency before reporting it.** GA4 returns revenue as a full float, and its own
> aggregation carries rounding noise: the same metric and period came back as a full float ending
> in `...740000000005` with no dimension, and cleanly as `...74` when split by `currencyCode` —
> measured on a live property, and confirmed to come from the API itself rather than these
> scripts. Two
> consequences: never paste the raw string to a marketer, and **never report a difference in the
> last few digits as a change** — a period-over-period delta of `0.000000000005` is noise, not
> movement.

Metrics that count events, like `eventCount`, are safe to sum, but **metrics ending in `~Users`,
session counts, rates, and averages must not be.** "How many users this month?" is the most
common question asked, so this mistake fails silently with a plausible-looking number.

> **`totalUsers` and `activeUsers` are not the same denominator.** `totalUsers` counts any user
> who logged an event; `activeUsers` requires an engagement signal (an engaged session, or
> `first_visit`/`first_open` with `engagement_time_msec`), so a user who opened the app without
> generating any engagement counts in the first but not the second. Measured live over the same
> 90-day window: `activeUsers` 99 vs `totalUsers` 124 — a 25% gap. GA4's own `*PerUser` metrics
> (`sessionsPerUser`, `screenPageViewsPerUser`, ...) divide by `activeUsers`, not `totalUsers`
> (measured: `sessions/activeUsers` matched `sessionsPerUser` to full float precision;
> `sessions/totalUsers` did not). If you need a "per user" figure, use the metric GA4 already
> computes rather than hand-dividing by whichever `~Users` metric happens to be in the response —
> the two are not interchangeable and neither is "more correct" than the other, they answer
> different questions.

If the response carries `non_additive_metrics` and `note`, those metrics fall into this category.
**If you need a true total, don't sum rows — query again for the same period with no `dimensions`.**
(For pivot, `metric_aggregations: ["TOTAL"]` is another way to get an `aggregates` row —
but only with 2 or more `pivots` entries; see the note under "Pivot" below.)

> **Exception: `dauPerMau`/`dauPerWau`/`wauPerMau` break the "no dimensions = safe" rule above.**
> These are rolling day-by-day ratios, and requesting one over a period longer than a day — even
> with no `date` dimension, the one case every other non-additive metric here treats as a clean
> total — returns GA4's own **sum of the daily values**, not a period ratio. Measured live, twice:
> a 6-day `dauPerWau` query with no dimensions matched the same six days queried broken out by
> `date` and summed by hand, to double-precision float accuracy. If the response's `note` names one
> of these three, request the metric for a single day instead, or break it out by `date` and read
> each day on its own — never trust the no-dimension aggregate for a multi-day period.

## Commonly used dimensions/metrics
- Dimensions: `date`, `eventName`, `pagePath`, `deviceCategory`, `sessionSource`, `country`
- `dateRange` is a special dimension that only appears in responses. It cannot be put in request `dimensions` (see above).
- Metrics: `eventCount`, `totalUsers`, `activeUsers`, `screenPageViews`, `sessions`, `keyEvents`
- If unsure, look it up with `ga4_metadata.py get-metadata --search <term>`. The unfiltered
  catalogue is ~400 dimensions and ~120 metrics (about 12k tokens); `--search` is repeatable
  and matches API or UI names, and `--kind dimension|metric` drops the other list. A filtered
  response carries `filtered` with the unfiltered totals, so a narrowed list never reads as
  the whole catalogue.

## Custom definitions (custom dimensions and metrics)

Event parameters and user properties from the taxonomy can only be queried **once registered** in GA4.
Registration status is in `.ga4/custom_definitions.json` (generated by ga-taxonomy), under `by_parameter`.

| Scope | Prefix | Example |
|---|---|---|
| Event parameter | `customEvent:` | `customEvent:search_term` |
| User property | `customUser:` | `customUser:newsletter` |
| Item (ecommerce) | `customItem:` | `customItem:size` |

### Always confirm whether it's a dimension or a metric
A parameter can be registered as **either a dimension or a metric**, and the prefix `customEvent:`
is the same either way. Putting a `kind` of `metric` into `dimensions` makes the query fail.
Check the registry's `kind` and put it under the matching `dimensions`/`metrics`.

### Metrics are exposed as 3 aggregation variants

| aggregation | api_name | meaning |
|---|---|---|
| `default` | `customEvent:stay_time` | sum |
| `average` | `averageCustomEvent:stay_time` | average |
| `count` | `countCustomEvent:stay_time` | count |

### Check the unit and convert before describing the result
The registry's `type` is the unit. **If it's `TYPE_MILLISECONDS`, divide by 1000 to convert to
seconds** before describing it. A millisecond sum comes back as an eleven-digit number, which is
unreadable to a marketer as-is — and worse, looks like a plausible count rather than a wrong unit. Read `type` from the `default` variant — the `count`
variant is always `TYPE_INTEGER`, which loses the unit information.

### Don't assume an empty result means "no data"
An empty result for a custom definition query has three possible causes:
1. It was **never registered** (if it's not in the registry, this is it).
2. **Only data from after the registration date exists** — custom dimensions are not applied
   retroactively, so past periods are empty.
3. The value genuinely doesn't exist.

If it's in the registry but empty, suspect cause 2 first and re-query with a narrower period to confirm.

### Prefer a standard dimension when one exists
`page_location`, `search_term`, `percent_scrolled`, etc. are also queryable as standard dimensions
(`pageLocation`, `searchTerm`, `percentScrolled`). Standard dimensions are safer than custom
dimensions because they **cover the full period**. When both exist, use the standard one; if there's
a reason to use the custom one instead, disclose the period limitation alongside it.

### Other custom definitions
`custom_definitions.json`'s `other` holds custom channel groups (`customChannelGroup:`, etc.) and
calculated metrics (`calcMetric:`). These are unrelated to the taxonomy but can be queried as-is.

## Metric expressions (derived metrics)

A `metrics` entry can be an object instead of a string. Giving `expression` lets the API compute
a derived metric like a ratio directly (more accurate than computing it by hand):

```json
{"metrics": ["sessions", "keyEvents", {"name": "keyEventsPerSession", "expression": "keyEvents/sessions"}]}
```

- `name` (required): the name of this column in the response. Reusing **another requested metric's**
  name is a 400 ("Duplicate metrics" — e.g. a string `eventCount` alongside an expression named
  `eventCount`). But naming an expression after a built-in metric you did **not** also request (e.g.
  `{"name":"sessions","expression":"totalRevenue/eventCount"}`) does **not** error — it silently
  replaces that column with the expression's value (measured live: the `sessions` column then held an
  AOV-like number, not session counts). Use a distinct name like `aov` to avoid that confusion.
  `expression` (optional): the metric arithmetic expression.
- Supported only by `ga4_query.py` (runReport). Realtime, pivot, cohort, and funnel only accept string metrics.
- **If the expression references a revenue metric (`totalRevenue`, `purchaseRevenue`, `itemRevenue`, …),
  request that revenue metric in `metrics` as well.** Measured live: an expression like
  `{"name":"aov","expression":"totalRevenue/eventCount"}` requested *alone* came back as `totalRevenue`
  itself (mobile ≈ ₩4.09 billion — the raw numerator, sorted that way too), **not** the
  tens-of-thousands-of-won ratio;
  adding `totalRevenue` to `metrics` made the same expression compute correctly. Expressions over
  non-revenue metrics (`eventCount/sessions`) compute fine on their own. When this trap is possible the
  response carries `expression_revenue_operands` and a warning — a "ratio" that reads like a large total
  is the giveaway; re-query with the revenue metric included.
  **The auto-check only catches metrics ending in `Revenue`.** Other money metrics that don't —
  `itemRefundAmount`, `advertiserAdCost`, `averageRevenuePerUser`, custom `customEvent:refundAmount` —
  are not flagged, so request them alongside the expression too (the same raw-operand trap may apply).
  A bare alias (`{"name":"tr","expression":"totalRevenue"}`, no operator) is a correct rename and is
  never flagged.
- To match the UI's "session conversion rate", it's better to use the built-in metric
  `sessionKeyEventRate` directly.

## dimension_filter (string dimension)
Leaf:
```json
{"field": "eventName", "value": "purchase"}
{"field": "pagePath", "match_type": "CONTAINS", "value": "/blog"}
{"field": "deviceCategory", "in_list": ["mobile", "tablet"]}
```
`match_type`: EXACT (default), CONTAINS, BEGINS_WITH, ENDS_WITH, FULL_REGEXP, PARTIAL_REGEXP. `case_sensitive` (default false). `in_list` must be an array of **scalar** values (strings or numbers; a single string is not allowed, and a nested list/dict is rejected).
`value` takes a **single** value — passing an array there (an `in_list` mistaken for `value`) is rejected with a pointer to `in_list`, because it would otherwise stringify to `"['purchase', 'refund']"` and silently match nothing (a confident 0-row answer).

Compound (recursive combination):
```json
{"and": [ {"field": "eventName", "value": "purchase"}, {"field": "deviceCategory", "in_list": ["mobile"]} ]}
{"or":  [ {"field": "country", "value": "Korea"}, {"field": "country", "value": "Japan"} ]}
{"not": {"field": "eventName", "value": "spam"}}
```

## metric_filter (numeric metric)
```json
{"metric": "eventCount", "op": ">=", "value": 10}
{"metric": "totalUsers", "op": "between", "from": 100, "to": 1000}
```
`op`: `>` `>=` `<` `<=` `=` `!=` `between` (from/to). Can be combined with and/or/not (same as dimension_filter).
`value`/`from`/`to` must be **plain, finite JSON numbers** — a quoted `"100"`, a boolean, or `NaN`/`Infinity`
is rejected (a quoted number or boolean would otherwise be silently converted: `float("100")` is `100.0`,
`float(true)` is `1.0`; `NaN`/`Infinity` parse in Python but are not GA4 comparison values). For `between`,
**`from` must be `<= to`**: an inverted range matches nothing and GA4 answers with zero rows and no error
(measured live), which reads as "no events". `from == to` is a valid single-value match.

## order_bys (sorting / Top-N)
```json
[{"metric": "eventCount", "desc": true}]
[{"dimension": "date", "desc": false}]
```
Ascending order if `desc` is omitted. Top-N = `order_bys` (desc) combined with `limit`.
Each entry takes **exactly one** of `metric` or `dimension` — putting both in one entry is rejected
(it used to silently sort by the metric and drop the dimension). For a metric sort with a dimension
tiebreak, use two entries: `[{"metric": "totalRevenue", "desc": true}, {"dimension": "itemName"}]`.

Sorting by `dimension` uses GA4's default lexical order, which is wrong for a numeric-looking
dimension that GA4 does **not** zero-pad — `hour` ("0".."23") and `minute` ("0".."59") sort as
0, 1, 10, 11, ..., 19, 2, 20, ... under lexical order (measured live). This script requests GA4's
NUMERIC order type automatically for those two, so `{"dimension": "hour"}` already comes back in
the expected 0..23 order — no special handling needed on your end. (Every other numeric-looking
dimension — `date`, `day`, `month`, `week`, `year`, `yearMonth`, the cohort `nth*` family — is
zero-padded by GA4 and already sorts correctly either way.)

`dayOfWeekName` has the same problem but no server-side fix: it's text ("Monday", "Friday", ...),
so there's no NUMERIC reading of it, and GA4 rejects ordering by a dimension not in the request's
`dimensions` list (so the calendar-correct key, `dayOfWeek`, can't be silently substituted without
also injecting an extra column). Sorting by `dayOfWeekName` comes back Friday, Monday, Saturday,
Sunday, Thursday, Tuesday, Wednesday (measured live) — for calendar order, add `dayOfWeek`
(0=Sunday..6=Saturday) to `dimensions` and sort by that, keeping `dayOfWeekName` only for the
display label. The response carries a `note` when this trap is hit.

`appVersion` has the same problem and, unlike `dayOfWeekName`, no other dimension to substitute:
GA4 sorts it as plain text, not semver, so a version with a two-digit part sorts ahead of one with
a one-digit part in the same position regardless of numeric value. Measured live, filtered to
`{0.9.0, 0.9.1, 0.10.0, 0.11.0}` and sorted by `appVersion`: `0.10.0, 0.11.0, 0.9.0, 0.9.1` — every
`0.1x` release sorted ahead of every `0.9x` one. NUMERIC order type does **not** fix this either
(measured: it produced a third, still-wrong order) — a multi-part version string isn't a single
number. Do not trust an `order_bys`-sorted `appVersion` result for a version-history or
"which version introduced this" answer; sort the rows yourself by parsing each version's
dot-separated parts as integers. The response carries a `note` when this trap is hit.

**This isn't limited to `hour`/`minute`/`dayOfWeekName`/`appVersion` — any numeric-looking string
dimension can have the same problem, including custom ones, and this script has no way to know a
custom dimension's semantics to fix it automatically.** Measured live: a `customUser:` count property
(unpadded, app-defined) sorted by itself came back `1, 10, 102, 103, 11, 12, ..., 168, 169, 17,
18, ...` — the exact same lexical-order scramble, just on a dimension this script cannot special-
case the way it does `hour`/`minute`. Before trusting an order_bys result on any numeric-looking
dimension not in the short list above, spot-check that the first several values actually increase
(or decrease) the way you expect.

## Example runs
```bash
# Top 10 events by count
echo '{"dimensions":["eventName"],"metrics":["eventCount"],"order_bys":[{"metric":"eventCount","desc":true}],"limit":10}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_query.py

# Last 7 days vs previous 7 days event count comparison
echo '{"metrics":["eventCount"],"date_ranges":[{"start_date":"7daysAgo","end_date":"yesterday"},{"start_date":"14daysAgo","end_date":"8daysAgo"}]}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_query.py
```

## Principles
- Map the natural-language request to events/parameters in `.ga4/taxonomy.md`, then choose dimensions/metrics.
- On an empty result, retry with a relaxed period or filter.

## Realtime report (runRealtimeReport)
`ga4_realtime.py` queries activity from the last 30 minutes. Request spec:
```json
{
  "dimensions": ["country", "eventName"],
  "metrics": ["eventCount"],
  "minute_ranges": [{"start_minutes_ago": 29, "end_minutes_ago": 0, "name": "last30"}],
  "dimension_filter": { },
  "metric_filter": { },
  "order_bys": [ ],
  "limit": 100
}
```
- `date_ranges`/`offset` don't exist for realtime. Instead, `minute_ranges` (optional, defaults to the last 30 minutes). Each entry has `start_minutes_ago`/`end_minutes_ago` (0-29 for standard properties, 0-59 for GA360) and an optional `name`.
  These count **minutes ago**, so the window's start is the **larger** number (further in the past): **`start_minutes_ago` must be `>= end_minutes_ago`**. For "the last 5 minutes" use `{"start_minutes_ago": 5, "end_minutes_ago": 0}` — writing `{0, 5}` is inverted and is rejected (the opposite of an ordinary from/to range). `start == end` is a valid single-minute window.
- Filter/order syntax is the same as runReport above.

### Valid realtime dimensions/metrics
- Dimensions: `appVersion`, `audienceId`, `audienceName`, `city`, `cityId`, `country`, `countryId`, `deviceCategory`, `eventName`, `minutesAgo`, `platform`, `streamId`, `streamName`, `unifiedScreenName`
- Metrics: `activeUsers`, `eventCount`, `keyEvents`, `screenPageViews`
- `activeUsers` **cannot share a report with any of the other three** (measured live: each
  pairing 400s, while eventCount/keyEvents/screenPageViews combine freely among themselves).
  The script rejects the pairing — run activeUsers alone and the others together as two
  queries, then report them side by side.
- Event-scoped custom metrics are unsupported in realtime.

### Example run
```bash
# Active users by country in the last 30 minutes
echo '{"dimensions":["country"],"metrics":["activeUsers"],"order_bys":[{"metric":"activeUsers","desc":true}]}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_realtime.py
```

## Pivot (cross-tab) report (runPivotReport)
`ga4_pivot.py` builds a cross-tab aggregation across two or more axes.

> Warning: **filter targets must also be in the requested list.** Unlike runReport, pivot
> rejects a `dimension_filter` dimension not present in `dimensions`, or a `metric_filter`
> metric not present in `metrics`. For example, to filter on `eventName`, also include
> `eventName` in `dimensions`. A mismatch is caught before the API call, explaining which
> field to add and where.

Request spec:
```json
{
  "dimensions": ["country", "deviceCategory"],
  "metrics": ["eventCount", "activeUsers"],
  "date_ranges": [{"start_date": "7daysAgo", "end_date": "yesterday"}],
  "pivots": [
    {"field_names": ["country"], "limit": 10,
     "order_bys": [{"metric": "eventCount", "desc": true}],
     "metric_aggregations": ["TOTAL"]},
    {"field_names": ["deviceCategory"], "limit": 5}
  ],
  "dimension_filter": { },
  "metric_filter": { }
}
```
- Each entry in `pivots` is one axis. The dimension(s) in `field_names` (required) must also be present in top-level `dimensions`.
  **GA4 requires a `limit` on every axis** — an axis without one is a 400 ("limit is required in PivotReportRequests",
  measured live), not an unbounded result. A missing `limit` is defaulted: a **single** axis gets GA4's recommended
  10000, but GA4 also caps the **product** of all axis limits at 250000 ("The product of the limit parameter cannot
  exceed 250000", measured live), so with **several** axes the default is scaled down (~250 for two, ~31 for three) to
  stay under the cap. Set `limit` explicitly to bound an axis (`5` for top-5). `pivot_axes[].truncated` reports an
  axis that has more values than its limit.
- Per-pivot optional fields: `limit` (defaulted when omitted, scaled to the axis count — see above), `offset`, `order_bys` (same syntax as runReport), `metric_aggregations`.
- `metric_aggregations`: `TOTAL`, `MINIMUM`, `MAXIMUM`, `COUNT`. When requested, an `aggregates` row is added to the response (the axis dimension value there is a special value like `RESERVED_TOTAL`).
  Pivot keeps these in a **separate** `aggregates` key, so the main `rows` stay a clean breakdown.
  **The funnel does not** — see the warning under the funnel breakdown recipe below.
  **Confirmed in practice: this requires 2 or more entries in `pivots[]`.** With a single pivot, GA4 silently
  returns zero `aggregates` rows — no error, the `aggregates` key just doesn't appear in the response, which
  reads the same as "nothing requested." Use the 2-pivot shape shown in the example below (a second pivot
  over any dimension, even one you don't otherwise care about, is enough to unlock the total row).
- Filter/order syntax is the same as runReport. The response's `rows` is the cross-tab flattened out over every cell.
- **Period comparison**: give 2 or more `date_ranges` and add `{"field_names": ["dateRange"]}` as the **last** entry in `pivots[]` (GA4 constraint: the date_range axis must be last). Warning: `dateRange` still must never go in top-level `dimensions` here either — that causes a 400. An out-of-order entry, or putting it in dimensions, is caught and explained locally before the API call.

### Example run
```bash
# Country x device cross-tab, top 10 countries by count + country subtotal
echo '{"dimensions":["country","deviceCategory"],"metrics":["eventCount"],"pivots":[{"field_names":["country"],"limit":10,"order_bys":[{"metric":"eventCount","desc":true}],"metric_aggregations":["TOTAL"]},{"field_names":["deviceCategory"],"limit":5}]}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_pivot.py

# Compare the last two periods per event (dateRange goes only in the last pivot axis, not in dimensions)
echo '{"dimensions":["eventName"],"metrics":["eventCount"],"date_ranges":[{"start_date":"14daysAgo","end_date":"8daysAgo"},{"start_date":"7daysAgo","end_date":"yesterday"}],"pivots":[{"field_names":["eventName"],"limit":10,"order_bys":[{"metric":"eventCount","desc":true}]},{"field_names":["dateRange"],"limit":2}]}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_pivot.py
```

## Cohort (retention) report (runReport + cohort_spec)
`ga4_cohort.py` tables how a group of users acquired at a given point (a cohort) keeps returning
over the following periods. Each row is a combination of "acquisition group x elapsed offset (Nth)".
For example, a WEEKLY cohort answers "of users who signed up in week 1 of June, how many were
active 0, 1, 2... weeks after signup".

Request spec (shorthand form, single cohort):
```json
{
  "granularity": "WEEKLY",
  "date_range": {"start_date": "2026-06-01", "end_date": "2026-06-28"},
  "offsets": {"start": 0, "end": 4},
  "dimension": "firstSessionDate",
  "accumulate": false,
  "metrics": ["cohortActiveUsers"],
  "dimensions": [],
  "dimension_filter": { },
  "metric_filter": { },
  "order_bys": [ ],
  "limit": 250,
  "offset": 0
}
```
- `granularity` (required): `DAILY`, `WEEKLY`, or `MONTHLY`.
- `date_range` (required): the acquisition period that defines the cohort (e.g. to group everyone who signed up across weeks 1-4 of June, specify the whole month of June).
- `offsets` (required): the elapsed offsets to observe, e.g. `{"start": 0, "end": 4}` (0 = the point of acquisition).
  Offsets count forward from week 0, so **neither can be negative**, and **`start` must be `<= end`**: an
  inverted window (e.g. `{"start": 4, "end": 1}`) matches no week, and GA4 answers it with **zero rows and
  no error** — measured live — which reads as "retention fell to nothing". Both are rejected locally with
  the reason. `start == end` is a valid one-week window.
- `dimension` (optional, default `firstSessionDate`): the dimension defining the cohort.
- `accumulate` (optional, default false): see below.
- `metrics` (optional, default `["cohortActiveUsers"]`): only `cohort`-prefixed metrics are allowed.

To compare multiple cohorts side by side (e.g. comparing retention of week-1-of-June vs. week-2-of-June
signups), pass `cohort_spec` directly using the full-control form:
```json
{
  "cohort_spec": {
    "cohorts": [
      {"name": "week1", "dimension": "firstSessionDate", "date_range": {"start_date": "2026-06-01", "end_date": "2026-06-07"}},
      {"name": "week2", "dimension": "firstSessionDate", "date_range": {"start_date": "2026-06-08", "end_date": "2026-06-14"}}
    ],
    "cohorts_range": {"granularity": "WEEKLY", "start_offset": 0, "end_offset": 4},
    "cohort_report_settings": {"accumulate": false}
  },
  "metrics": ["cohortActiveUsers"]
}
```

### granularity <-> elapsed (Nth) dimension mapping
| granularity | Nth dimension | meaning |
|---|---|---|
| `DAILY` | `cohortNthDay` | days since acquisition |
| `WEEKLY` | `cohortNthWeek` | weeks since acquisition |
| `MONTHLY` | `cohortNthMonth` | months since acquisition |

`cohort`, the matching Nth dimension, and the default metric are **auto-injected**, so you don't need to add them yourself. Adding a different (mismatched) Nth dimension in `dimensions` is rejected.

### Metrics
Only `cohort`-prefixed metrics are allowed (a general metric like `eventCount` is rejected). Notably:
- `cohortActiveUsers`: the number of users active during that elapsed offset.
- `cohortTotalUsers`: the total number of users in the cohort (regardless of offset, useful as a denominator).

### accumulate
Must stay `false` (the default). In GA4 the field means "return a **cumulative** value from 0 through
that Nth offset", but **`true` only works via `runPivotReport`, and this script always calls
`runReport`** — so it can never succeed here. Confirmed live: GA4 rejects it 100% of the time with
`400 Accumulate is not supported in report request; use pivot report request.` This is now caught
locally before the API call (both in the shorthand form and in
`cohort_spec.cohort_report_settings`). If you need a cumulative total, request the offsets you care
about and add up `cohortActiveUsers` across them yourself.

### Interpreting the response
`rows` contains `cohort` (the shorthand default is `Cohort`; with `name` given it's that value; with multiple cohorts, each `name`), the Nth dimension (e.g. `cohortNthWeek`), and the metric. Nth=0 is the acquisition point itself (the day/week/month of signup), and Nth=1 is the value for users who returned in the following offset. To get a retention rate, compute `cohortActiveUsers / cohortTotalUsers` (at Nth=0) yourself.

**A far offset can come back with no row at all if its window hasn't fully elapsed.** Measured
live: a WEEKLY cohort acquired in a past week, requested with `offsets.end: 3` while offset 3's
week was still in progress, silently dropped that offset's row — GA4 gives no error, and the
gap looks identical to "zero users returned that week." The response's `note` flags this
(`add_cohort_unsettled_note` in `ga4_reporting.py`, mirroring the `unsettled_ranges` check other
reports get — that one only reads `date_ranges`, which cohort specs don't have). Don't report a
missing recent offset as a retention number; wait for the window to fully pass, or narrow
`offsets.end`.

### Common errors
- A cohort `name` cannot start with `cohort_` (GA4 constraint). A violation is caught and explained locally before the API call.
- Passing top-level `date_ranges` is rejected — cohort specifies the acquisition period via `date_range` (shorthand) or `cohort_spec.cohorts[].date_range` (full control).
- A non-`cohort`-prefixed metric like `eventCount` is rejected — only cohort-specific metrics like `cohortActiveUsers`/`cohortTotalUsers` are allowed.
- `accumulate: true` is rejected (see "accumulate" above) — it requires `runPivotReport`, which this script never uses, so it always failed at the API. Sum the offsets yourself instead.

### Example run
```bash
# Users who signed up in weeks 1-4 of June, retention (active users) at 0-4 weeks after signup
echo '{"granularity":"WEEKLY","date_range":{"start_date":"2026-06-01","end_date":"2026-06-28"},"offsets":{"start":0,"end":4}}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_cohort.py
```

## Funnel (conversion/drop-off) report (runFunnelReport, v1alpha)
`ga4_funnel.py` shows how much users convert or drop off across ordered steps (e.g. page view ->
add to cart -> purchase). `is_open_funnel` (default false) chooses between a closed funnel (steps
must be completed in order starting from step 1) and an open funnel (entering mid-sequence still counts).

Request spec:
```json
{
  "steps": [
    {"name": "Page view", "event_name": "page_view"},
    {"name": "Add to cart", "event_name": "add_to_cart", "within_duration_seconds": 3600},
    {"name": "Purchase", "event_name": "purchase"}
  ],
  "is_open_funnel": false,
  "date_ranges": [{"start_date": "28daysAgo", "end_date": "yesterday"}],
  "funnel_visualization_type": "STANDARD_FUNNEL",
  "funnel_breakdown": {"dimension": "deviceCategory", "limit": 5},
  "limit": 250
}
```
- `steps` (required, at least 2): each step needs `name` (required) plus **exactly one** of 3 definition styles.
- `date_ranges` (optional, defaults to the last 7 days).

> Warning: **do not put a number in a step's `name`.** The API automatically prefixes responses
> with `"1. "`, `"2. "`, etc. If `name` is given as `"1. Visit start"`, the result becomes
> `"1. 1. Visit start"`.

### 3 ways to define a step
- `event_name` (string): defines the step as a specific event occurring. Example: `"event_name": "purchase"`.
- `field` (string) + `value` or `in_list`: based on a dimension value (string/list only, no numeric conditions). Fine-tune with `match_type` (default `EXACT`) and `case_sensitive` (default false). Example: `{"field": "eventName", "value": "add_to_cart"}`. A **custom event parameter works fine here too** — verified live, `{"field": "customEvent:dol_type", "value": "..."}` returned a normal step with real completion/abandonment numbers, so this is not restricted to standard dimensions. Warning: some standard dimensions are specifically excluded — `pagePath` causes a 400 (`Field 'pagePath' is not currently supported inside segments & funnel steps`, see the limitations table in `analysis-recipes.md`); there is no general rule for predicting which others are, so treat a 400 naming a field as evidence for that field specifically, not proof that its whole category is unsupported.
- `filter_expression` (object, full control): recursively combined with `and`/`or` (list) and `not` (single node), with leaves being `event_name` or `field` (same syntax as above). The syntax resembles `dimension_filter` (runReport), but it's a **funnel-specific type**, so it's a separate tree.

### Step options
- `is_directly_followed_by` (bool, optional): if true, the event must be the **immediate next** one after the previous step to count (any other event in between disqualifies it). If omitted/false, only the order needs to hold.
- `within_duration_seconds` (integer, optional): must be reached within this many seconds of the previous step to count. Example: `3600` counts only purchases made within 1 hour of adding to cart.

### funnel_visualization_type
- `STANDARD_FUNNEL` (default): fills `funnel_table`. **Also fills `funnel_visualization`** — measured live,
  including with no `funnel_visualization_type` given at all — but with only `funnelStepName` as its dimension
  (an overall per-step summary whose `activeUsers` values match `funnel_table`'s row for row when there's
  no `funnel_breakdown` — but `funnel_visualization` only ever carries the `activeUsers` metric, never
  `funnel_table`'s `funnelStepCompletionRate`/`funnelStepAbandonments`/`funnelStepAbandonmentRate`); it does
  **not** carry a `date` breakdown. (An earlier version of this doc claimed STANDARD leaves `funnel_visualization`
  empty — wrong, corrected after direct measurement.)
- `TRENDED_FUNNEL`: adds a `date` dimension to `funnel_visualization`, turning it into an actual trend over
  dates. Use this to see conversion trends over a period.

### funnel_breakdown
Given as `{"dimension": "deviceCategory", "limit": 5}`, this splits per-step conversion/drop-off by that dimension (device, channel, etc.). `dimension` is required, `limit` is optional (uses the API default if omitted).

### Interpreting the response
The two sub-reports `funnel_table` and `funnel_visualization` each consist of `dimension_headers`, `metric_headers`, `row_count`, and `rows`. Both are filled under either `funnel_visualization_type` (measured live) — the difference is whether `funnel_visualization` carries a `date` dimension (`TRENDED_FUNNEL`) or not (`STANDARD_FUNNEL`, where its `dimension_headers` is `funnelStepName` only). With no `funnel_breakdown`, that `STANDARD_FUNNEL` `funnel_visualization`'s `activeUsers` values match `funnel_table`'s row for row, though `funnel_visualization` never carries `funnel_table`'s rate/abandonment metrics. With a `funnel_breakdown` present, `funnel_table` carries the full per-breakdown-value detail (plus `RESERVED_TOTAL` rows) while `funnel_visualization` stays a smaller, breakdown-blind overall-per-step summary — measured live: a 2-step funnel with a 3-value `platform` breakdown gave `funnel_table` 6 rows and `funnel_visualization` 2. Each row holds the user count/rate for a step (and breakdown dimension value, if specified — `funnel_table` only).

### Unsupported (excluded) features
Even where the GA4 Data API supports the following, `ga4_funnel.py` does not accept them. Putting
them in the spec gets rejected locally before the API call (previously they were silently ignored,
so a filter that looked applied had no effect and full unfiltered data came back — now the reason
is explained and it's blocked):
- Request-level `dimension_filter` (runReport's overall filter) — only per-step filters are available.
- `segments` (segment comparison).
- `funnel_next_action` (next-action analysis).
- Any other unknown key (including typos) is rejected the same way.

### Example run
```bash
# page_view -> add_to_cart -> purchase funnel, broken down by device
echo '{"steps":[{"name":"Page view","event_name":"page_view"},{"name":"Add to cart","event_name":"add_to_cart"},{"name":"Purchase","event_name":"purchase"}],"date_ranges":[{"start_date":"28daysAgo","end_date":"yesterday"}],"funnel_breakdown":{"dimension":"deviceCategory","limit":5}}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_funnel.py
```

## E-commerce analysis recipes

Patterns below are confirmed against a live production e-commerce property. Each one calls out the
mistake that looks plausible but is wrong, not just the working shape.

### Item revenue / item performance (`ga4_query.py`)
Standard item-scoped dimensions/metrics (`itemCategory`, `itemName`, `itemId`, `itemRevenue`,
`itemsPurchased`, `itemsViewed`, ...) are queryable without any registration — see "Custom
definitions" above for the item-scoped custom ones (`customItem:`).
```bash
echo '{"dimensions":["itemCategory"],"metrics":["itemRevenue","itemsPurchased"],"date_ranges":[{"start_date":"30daysAgo","end_date":"yesterday"}],"order_bys":[{"metric":"itemRevenue","desc":true}]}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_query.py
```
> Warning: **item-scoped dimension values can carry raw HTML entities** if that's how the site's
> ecommerce implementation set them (observed on a live property: `itemCategory` values like
> `"Tours &amp; Tickets"` — a literal `&amp;`, not a decoded `&`). Filtering by the human-readable
> form (`"Tours & Tickets"`)
> silently returns zero rows — no error, since it's a perfectly valid filter, it just doesn't match
> anything. If a category/name filter unexpectedly returns nothing, re-query without the filter
> first and copy the exact value as GA4 returns it, HTML entities included.
>
> Any filtered query that comes back with **zero rows** now carries a `note` saying exactly this.
> Treat that note as an instruction, not decoration: **do not report zero to the marketer until you
> have re-run without the filter.** Zero and "never matched" are indistinguishable in the response
> itself, and reporting "this category earned nothing" about a category that sells is worse than
> saying nothing.

> Warning: **item-scoped revenue and event-scoped revenue cannot go in one report.** Asking for
> `totalRevenue` (or `purchaseRevenue`) together with `itemRevenue` fails, and GA4's message names
> no field at all — observed verbatim on a live property: `"Please remove  to make the request
> compatible for example."`, with the slot empty. The scripts now diagnose this and name the actual
> pair, but the shape to plan for is: **split it into two queries.** Item-scoped fields describe
> products *inside* an event, so GA4 will not put them in the same table as event/session totals.
>
> The rule, measured exhaustively on a live property (105 metric pairs + 45 dimension/metric
> combinations; all 33 failures fit it with no exceptions): **a report fails iff it mixes the two
> poles below.** Anything in "neutral" joins either pole freely.
>
> | group | fields |
> |---|---|
> | **Item pole** | `itemName`, `itemCategory`, `itemId`, `itemRevenue`, `grossItemRevenue` |
> | **Order pole** | `totalRevenue`, `purchaseRevenue`, `averagePurchaseRevenue`, `transactions`, `ecommercePurchases`, `eventCount` |
> | **Neutral** | `sessions`, `totalUsers`, `purchaserRate`, `itemsPurchased`, `itemsViewed`, `itemsAddedToCart`, `cartToViewRate` |
>
> Two traps worth naming, because both invite an unnecessary split: the three item *dimensions*
> behave identically to each other (one rule, not three), and item **count** metrics are neutral
> even though they look item-scoped — `itemName` + `itemsPurchased` and `itemsViewed` +
> `totalRevenue` are both fine. It is item *revenue* that cannot sit beside order revenue, not
> everything with "item" in the name.
>
> The field list above is a verified subset, not the whole GA4 schema — it covers the common
> ecommerce fields. For anything outside it, run the query and let the script's diagnosis name the
> pair; it queries GA4 itself and so also covers custom (`customItem:`) fields.

> Warning: **do not sum a session/user metric across an item-scoped dimension.** Splitting `sessions`
> by `itemName` is allowed and returns no error, but one session that viewed six products is counted
> under all six, so the column sums to several times the property's real session count (measured on
> a live property: the per-item sum came out over 5x the true total). Report those per-item numbers
> as "sessions that involved this item" and never as a share of total sessions. For a denominator,
> run a second query without the item dimension.

### What GA4 says about the response itself (`metadata`)
Every runReport/runPivotReport response carries a `metadata` block that this skill now surfaces.
(Realtime responses have no metadata field at all, so the key is simply absent there.)

**`currency_code` — state it, never infer it.** This is the property's reporting currency, and it
does not have to match the country, the timezone, or the language of the conversation. Measured on
a live property: `time_zone` is `Asia/Seoul` while `currency_code` is `USD`. A revenue figure read
as won instead of dollars is wrong by roughly 1300x, and nothing else in the response would
reveal it. Write "USD 1234.50", never a bare number.

**`time_zone`** is the property's timezone — what `today`/`28daysAgo` resolve against, which is not
necessarily the machine's timezone.

Three flags appear **only when true**, and each one changes whether the numbers can be quoted:

| flag | what it means |
|---|---|
| `sampling` | the report is an estimate from a sampled subset, not a count — say so, and don't treat small differences as real |
| `subject_to_thresholding` | GA4 withheld rows to protect user privacy; totals are short by an unknown amount, so treat them as a **lower bound** |
| `data_loss_from_other_row` | high-cardinality values were collapsed into one `(other)` row, so a "top N" is missing an unrecoverable tail — narrow the query if the tail matters |

When any of these fire, the explanation is also prepended to `note`, sampling first.

> ⚠️ **Sampling + expression + raw-metric trap**: if a **sampled** response also mixes a computed
> expression (e.g. `totalRevenue/eventCount`) with the raw **event-scope revenue** metric it uses
> (`totalRevenue`, `purchaseRevenue`), the raw column can come back **far smaller than its true total** —
> measured live, ~13x smaller with the event count unchanged, deterministically; the identical query on a
> non-sampled dimension was consistent. The response then carries `expression_sampling_overlap` and a
> warning. Do **not** quote the raw revenue column from such a response — request it in a separate query
> with no expression, or narrow the query so sampling does not trigger. Item-scope revenue (`itemRevenue`)
> and count metrics (`eventCount`, `sessions`, `totalPurchasers`) do NOT drift this way (all measured
> byte-identical), so they are not flagged.

> Honesty about coverage: all three flags have now been exercised **live** — the expression-sampling
> trap above on a sampled response, `(other)`-row data loss on a high-cardinality item breakdown, and
> `subject_to_thresholding` on a sensitive user breakdown (city × `userAgeBracket` with `activeUsers`,
> which correctly reported "totals are a lower bound"). The currency/timezone fields were measured
> directly.

### A daily series with days missing from it (`missing_dates`)
GA4 omits a row entirely when **every** requested metric is zero for it. In a revenue-by-date
query that means a day with no orders is simply absent. Measured on a live property: a 7-day
`purchaseRevenue` by `date` query returned six rows, and the missing day had over a thousand
sessions and zero orders — the same query for `sessions` returned all seven.

Nothing about the response looks wrong, and the damage is arithmetic. A daily average taken over
the returned rows divides by 6 instead of 7 and lands ~17% high, and a trend line joins the two
surrounding days and hides the zero. `missing_dates` lists the dropped days; treat them as **real
zeros** and count them in.

Limitation, deliberately: gaps are detected **between** the dates present, so a day missing at the
very start or end of the range is not caught. Resolving `6daysAgo`/`today` locally would need the
property's timezone, which these scripts don't have — an off-by-one-day claim near midnight would
be worse than the gap it closes. When exact day counts matter, state the range explicitly with
absolute dates.

The same check runs for a `yearMonth` breakdown, one granularity coarser — `missing_dates` then
lists dropped months (`YYYYMM`) instead of days, and the note says "month(s)" instead of "day(s)".
Measured live on a subscription app: a 12-month `purchaseRevenue` by `yearMonth` query returned
only 4 rows (8 months had zero renewal revenue that period) — averaging over those 4 alone
overstated the true monthly average by roughly 3x.

### `(not set)` ranks like a real value but isn't one (`unset_dimensions`)
GA4 fills a dimension it received no value for with the literal string `(not set)`, which then
sorts and ranks like any other row. Measured on a live property: **"top coupons by revenue" put
`(not set)` first, holding most of the revenue** — it simply means "no coupon was used". And
`shippingTier` came back 100% unset across every purchase.

The response carries `unset_dimensions` with two lists:
- `partly_unset` — `(not set)` is mixed in with real values. **Never present it as the top item.**
  Exclude it from the ranking, or name it explicitly ("orders with no coupon").
- `fully_unset` — no row has a value at all. The event is firing but the app or site never
  attaches that parameter, so this is a **tracking gap**, not a breakdown. This is the
  parameter-level twin of `uninstrumented_metrics` below, and it is how the parameter case gets
  caught: the event inventory cannot see inside events, but an all-unset response gives it away.

  **Before calling `fully_unset` a tracking gap, check the platform.** A dimension
  that does not apply to this property's streams comes back entirely `(not set)`
  even when the implementation is perfect. The response does this for you across
  24 dimensions whenever config.json's `platforms` is on file — the 9-member page
  family, `browser`/`browserVersion`, the 12-member Enhanced Measurement family
  (web-stream), and `appVersion` (app-stream) — listing them under
  `unset_dimensions.platform_mismatched`. It deliberately stays silent when
  `platforms` is absent, when it contains `unknown` (an unclassified stream means
  the list isn't a complete answer), and for anything outside those 24; apply the
  reasoning below yourself in those cases.

  There are three families here, not two. `pagePath`, `pageTitle` and
  `landingPagePlusQueryString` are **web-stream** dimensions; `appVersion` is
  **app-stream**; and the `unified*` family — `unifiedScreenName` (its UI name is
  "Page title and screen name"), `unifiedScreenClass`, `unifiedPagePathScreen` —
  is **cross-platform**, carrying the page title/path on web streams and the
  screen name/class on app streams. `screenPageViews` is the metric that counts
  both. **There is no `screenName` dimension**: requesting one fails outright with
  `400 ... Field screenName is not a valid dimension`.

  - **App-only**: the page family is `(not set)` on every row — that is the wrong
    family, not a tracking gap. Use the `unified*` family instead. If
    `unifiedScreenName` is fully unset too, the app is not sending a screen-name
    parameter, and `unifiedScreenClass` still carries the auto-collected class
    name (measured on a live app-only property: `unifiedScreenName` entirely
    `(not set)` while `unifiedScreenClass` returned real screens). In a funnel,
    the first step is `screen_view`, not `page_view`.
  - **Web-only**: the `unified*` family is **populated** here — those rows are
    genuine page titles and paths, so never discard them as an app artifact or
    steer around the family. What is genuinely absent is app-scoped: `appVersion`
    and the app screen parameters have no stream to come from.
  - **Mixed**: `pagePath` is `(not set)` for the app half and `appVersion` is
    `(not set)` for the web half, and **both are correct** — report neither as a
    gap. Use the `unified*` family when you want one cross-platform view, and
    break down by the `platform` dimension (or filter to one) when you need the
    halves apart, saying which platform the figure covers.

`row_counts` gives `{unset, total}` per dimension so you can judge whether to look. Both of these
were measured on the same property: `orderCoupon` had **2 unset rows out of 53** and those two held
most of the revenue, while `pagePathPlusQueryString` had **1 unset row out of tens of thousands**
and was immaterial.
The counts are reported rather than filtered on, because a threshold that silenced the second would
eventually silence the first — row share and value share are not the same thing.

The share `(not set)` holds **of a metric** is deliberately not computed, because working it out
means summing rows — right for revenue, wrong for sessions or users (see "Metrics you must not
sum"). If you need that split, run a properly filtered query for it.

### A zero that means "never tracked" (`uninstrumented_metrics`)
"How much did we refund?" answered with "0" is the most damaging wrong answer in ecommerce
analysis: no error, and a completely plausible number. GA4 only records a refund if the app or
site sends a `refund` event, so a property that never implemented refund tracking reports `refundAmount` = 0
forever — indistinguishable from a shop that genuinely refunded nothing.

When a report is all-zero for a metric whose backing event has never been recorded (checked against
ga-taxonomy's `.ga4/collected_events.json`), the response carries an `uninstrumented_metrics` key
and leads its `note` with the explanation. **When you see that key, report a tracking gap, never a
business result.** Say "this isn't being tracked — the app or site never sends the `refund`
event", not "there were no refunds". The second one ends the conversation with a false fact.

Metrics covered: refund, promotion (`view_promotion`/`select_promotion`), item list
(`view_item_list`/`select_item`), cart, checkout, item view, and purchase-backed metrics.

The key maps each metric to the **list** of events that could fill it. Most have exactly one, but a
purchase on an app arrives as `in_app_purchase` or an `app_store_subscription_*` event, so
**every purchase-backed metric** (`transactions`, `ecommercePurchases`, the revenue and item
metrics, `itemsPurchased`, the purchaser metrics, `firstTimePurchasers`) names all four — quote
the list rather than picking the first, or you will send an app marketer to instrument the wrong
thing. The guard also stays silent for these metrics when the inventory shows *any* of the four
fired: a zero then is a real zero for the period, not a tracking gap.

If `.ga4/collected_events.json` is more than 30 days old, the note **hedges instead of asserting**
("may mean not tracked") and asks for a refresh. A months-old snapshot cannot support a present-tense
claim that the app or site still does not send the event — tracking added since then would not appear in it.
Refresh with the ga-taxonomy skill, then re-read the answer.

Two limits worth knowing. The check stays silent when `.ga4/collected_events.json` is absent (run
ga-taxonomy's event collection first) or describes a different property. And it only covers metrics
backed by a whole **event** — `shippingAmount`, `taxAmount` and `itemDiscountAmount` depend on
*parameters inside* the purchase event, which the inventory cannot see, so a zero there is still
ambiguous. If a marketer asks about those, check the taxonomy for the parameter before answering.

### A zero because the stream doesn't exist here (`platform_mismatched_metrics`)
A third reading of a zero metric, distinct from "never tracked" above: some metrics are backed by a
GA4 Enhanced Measurement event that only exists on a **web** data stream (configured per stream in
GA4 Admin, no app-stream equivalent at all) — `scrolledUsers` (users who fired the scroll event) is
the one confirmed case, found by scanning all 86 standard metrics for a web-only Enhanced Measurement
counterpart. Measured live on an app-only property: `scrolledUsers` read a bare 0 next to
`activeUsers: 884` in the same response, with **no explanation at all** — it isn't in
`EVENT_BACKED_METRICS`, so `uninstrumented_metrics` never considered it, and the platform check above
only ever looked at dimensions until this was added.

When the response carries `platform_mismatched_metrics`, say the metric can never be anything but 0
on this property's stream type — not a tracking gap the team could fix by adding an event (there's
nothing to add; the app SDK has no such event to send), and not a business zero either. The check
only fires when the metric's actual value is 0 in this response; a nonzero value (a mixed property
with a real web stream) is a genuine measurement.

> **Not coded into `platform_mismatched_metrics`, but the same shape of trap: some Firebase
> auto-collected *events* are OS-exclusive, not just stream-exclusive.** Measured live on an
> app-only (iOS+Android) property, filtered by `operatingSystem`: `app_remove` and `app_clear_data`
> both came back 100% Android across the whole event history (34 app versions, zero iOS rows for
> either) — matching Firebase's documented behavior that both are Android-only automatically
> collected events, with no iOS equivalent (iOS has no platform hook to observe an app removal or
> a data clear). The control case confirms this isn't just how this app instruments things:
> `app_update`/`os_update`, ordinary cross-platform auto-events, fired on both `iOS` and `Android`
> in the same query shape. So `eventCount` for `app_remove` filtered to `operatingSystem = iOS`
> reading 0 is not a tracking gap and not evidence nobody uninstalled on iOS — say so rather than
> reporting it as either. This is a documentation note, not a coded check (unlike
> `platform_mismatched_metrics`) — it is based on one property's measurement, matching Firebase's
> own documented event list, not verified against a second property.

### Revenue with zero purchases (`subscription_revenue`)
The mirror image of the tracking gap: on an app whose commerce is app-store
subscriptions, a report can show **real purchase revenue beside all-zero
purchase counts**. GA4 counts the subscription events (`app_store_subscription_*`) into purchase
revenue and into `transactions`, but not into `ecommercePurchases`, `totalPurchasers`,
`firstTimePurchasers` or `itemsPurchased` (measured on a live app-only property: 196 renewals
produced non-zero revenue and real transactions, with every purchase-count metric at 0).
When a response carries a `purchaseRevenue`/`grossPurchaseRevenue` that is non-zero while every
requested purchase-count/purchaser metric is 0, the response carries `subscription_revenue` (the
revenue metrics concerned) and its `note` carries the explanation. (It does not necessarily lead:
`uninstrumented_metrics` and `platform_mismatched_metrics` are applied after it and so land above
it — deliberately, since both make the stronger claim that the figure is not a measurement at
all.) Say the revenue is
**recurring subscription revenue**, and never compute an average order value from it —
`purchaseRevenue/ecommercePurchases` comes back 0 for this shape, which would read as
zero-priced orders.

> Warning: **`funnel_breakdown` mixes GA4's aggregate row in with the breakdown values.**
> Measured live, a device breakdown came back as `RESERVED_TOTAL`=392, `mobile`=235,
> `desktop`=155, `tablet`=2 — the total sitting in the same `rows` list as its own parts.
> Two quiet ways to get this wrong: reporting `RESERVED_TOTAL` as a device category, or
> adding the rows up and landing on exactly twice the real figure. The affected sub-report
> (`funnel_table` and/or `funnel_visualization`) carries `reserved_total_row_indexes` and a
> detail `note` naming those rows — the indexes are relative to that sub's own `rows`, so they
> live inside it. The **top-level `note` also carries a pointer** to the flagged sub-report, so
> a reader scanning only the top-level note (where every other warning lands) still sees it —
> exclude those rows before ranking or totalling. (Pivot has the same reserved values but keeps
> them in a separate `aggregates` key, so only the funnel needs this care.)

> Warning: **a `funnel_breakdown` can come back entirely `(not set)`.** Measured live, a
> `payment_type` breakdown on `add_payment_info` returned every real row as `(not set)` — the
> event fires but the app or site never attaches the parameter, so the breakdown carries no
> information.
> The affected sub-report carries `unset_dimensions.fully_unset`, and the **top-level `note`
> names it as a tracking gap**. Report it as missing instrumentation, not as a conversion result.
> The aggregate `RESERVED_TOTAL` rows above are excluded from this check (counting them would
> dilute a 100%-unset dimension into "partly unset" — measured: the same `payment_type` breakdown
> read as only 50% unset once its reserved rows were counted), so `fully_unset` reflects only the
> real breakdown values. A breakdown that is only partly `(not set)` behaves like the runReport
> case above — flagged in the sub-report, ranked with care.

### Cart-to-purchase funnel, filtered to one device (`ga4_funnel.py`)
The natural-looking mistake is mixing a step's `field`/`event_name` mode with a top-level `and` —
that combination is now rejected locally (confirmed live: it used to silently drop the added
condition and report the *unfiltered* number instead, e.g. "mobile purchases" measuring all
purchases). To combine an event with another condition, use `filter_expression` and put **every**
condition inside the `and`/`or`/`not` list — nothing sits alongside it:
```bash
# Correct: everything nested inside filter_expression's and[]
echo '{"steps":[{"name":"Add to cart","event_name":"add_to_cart"},{"name":"Mobile purchase","filter_expression":{"and":[{"event_name":"purchase"},{"field":"deviceCategory","value":"mobile"}]}}],"date_ranges":[{"start_date":"30daysAgo","end_date":"yesterday"}]}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_funnel.py
```
The same rule applies to `dimension_filter`/`metric_filter` on the other four scripts: don't put a
`field`/`metric` key next to a top-level `and`/`or`/`not` — nest it inside instead. Both shapes are
now caught locally with a message naming the fix if you get it backwards.

### Revenue by category, with a grand total (`ga4_pivot.py`)
`metric_aggregations: ["TOTAL"]` only populates the `aggregates` array when `pivots` has **2 or
more entries** (confirmed live: with a single pivot, GA4 returns an empty `aggregates` with no
error — it silently looks like the option did nothing). Add a second pivot over any dimension —
even one you don't otherwise care about — to unlock it. When `metric_aggregations` is requested on
a single pivot, the response now carries a `note` naming this and the fix, so the silently-dropped
total doesn't pass unnoticed:
```bash
echo '{"dimensions":["itemCategory","deviceCategory"],"metrics":["itemRevenue"],"pivots":[{"field_names":["itemCategory"],"limit":10,"order_bys":[{"metric":"itemRevenue","desc":true}],"metric_aggregations":["TOTAL"]},{"field_names":["deviceCategory"],"limit":5}],"date_ranges":[{"start_date":"30daysAgo","end_date":"yesterday"}]}' \
  | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_pivot.py
```

### "How many purchasers?" — additive vs. deduplicated metrics
`transactions`, `itemRevenue`, `purchaseRevenue`, `itemsPurchased` and similar count/sum metrics
are safe to sum across a dimension split. **`totalPurchasers` is not** — like `activeUsers`, it's a
deduplicated unique-person count, so summing it across `date` or `deviceCategory` overstates the
true total (a purchaser active on multiple days/devices is counted once per row; confirmed live,
+4% on a date split). The response carries `non_additive_metrics`/`note` when this applies — if a
true total is needed, re-query the same period with no dimensions instead of summing rows.
`firstTimePurchasers` is the exception that looks similar but isn't: a first purchase happens in
exactly one row, so summing it is safe (also confirmed live).

## Common output keys

Keys common to every report response:

| Key | Meaning |
|---|---|
| `row_count` | The number of rows **returned** (after truncation by `limit`) |
| `total_row_count` | The **total** number of matching rows. Only appears when truncated |
| `truncated` | `true` means `limit` truncated the result — the Top-N is not the whole dataset |
| `request` | The `property_id` and the full request spec that produced this result (for tracing when recombining) |

Describing a result as "the whole dataset" when `truncated` is true is wrong. If the whole dataset
is needed, raise `limit` and re-query, or state explicitly in the report that it's "based on the top N".

> Warning: **pivot reports don't have `total_row_count` at the top level.** GA4's
> `RunPivotReportResponse` has no single value that can be called "the total row count" —
> cardinality exists **separately per axis (pivot)**. Instead, per-axis truncation is reported
> via `pivot_axes`, and **if even one axis was truncated, a top-level `truncated: true` is
> attached.** So for pivot too, the absence of `truncated` correctly means "nothing was truncated".

Keys that appear only in pivot responses:

| Key | Meaning |
|---|---|
| `pivot_axes` | An array of per-axis truncation info. **In request order** — axis *i* corresponds to `request.spec.pivots[i]` |

Each entry in `pivot_axes`:

| Key | Meaning |
|---|---|
| `returned_values` | The number of **values** actually returned for that axis |
| `total_row_count` | The **total** number of values for that axis (cardinality) |
| `truncated` | `true` means that axis was truncated by `limit` |

> Don't read `returned_values` as a row count. The top-level `row_count` is the number of
> **rows** after crossing axes (3 axis values x 3 axis values = 9 rows), while `returned_values`
> is the number of **values for that one axis** (3). They count different things, so the two
> numbers appearing to disagree is expected.

Axis dimension names are not duplicated inside `pivot_axes` — read them from
`request.spec.pivots[i].field_names`, which is always present in the output. When reporting,
name the truncated axis explicitly. For example, if `pivot_axes[0]` is
`{"returned_values": 3, "total_row_count": 63, "truncated": true}` and
`request.spec.pivots[0].field_names` is `["country"]`, that means "only the top 3 of 63 total countries were shown."

> Warning: **a single axis can have multiple dimensions.** Since `field_names` is a list, an axis
> like `["country", "city"]` is possible. In that case `total_row_count` is not the cardinality of
> either single dimension but of the **combination** — observed: a `["country"]` axis had a
> cardinality of 63, while a `["country", "city"]` axis had **420** (the number of country x city
> pairs). So attributing this truncation to a single dimension — saying "3 of 63 countries" — is
> wrong. Name the axis by joining its fields, e.g. `country x city`, and describe it as
> "the **combination** was truncated" — e.g. "top 3 of 420 total country x city combinations."

> **An empty funnel can be data retention, not zero conversions.** Google states the retention
> setting "does not affect standard aggregated reports ... only explorations and funnel reports"
> ([data retention](https://support.google.com/analytics/answer/7667196)) — and `runFunnelReport`
> is a funnel report. Measured on a property set to 14 months, for January 2025: the funnel came
> back with **zero rows and no error**, while `runReport` over the identical period returned 783
> `add_to_cart` and 136 `purchase` events. Standard properties can be set to **2 months**, so the
> boundary is often much nearer than it sounds.
>
> The response carries `beyond_retention_days` when the period reaches past it. Report that the
> funnel cannot see that far and verify the events with `ga4_query.py`. The `steps_without_data`
> note is already softened in this case — it no longer flatly claims zero reach — but still lead
> with the retention explanation rather than the missing-steps one. **The key's absence is not an
> all-clear** — it is also absent when the retention setting was never recorded. In that case an
> empty funnel carries a note saying the check could not run; verify with `ga4_query.py` rather
> than reporting a zero, and re-select the property with the ga-auth skill to record the setting.

Keys that appear only in funnel responses:

| Key | Meaning |
|---|---|
| `steps_without_data` | Names of requested steps that **had no row in the response**. GA4 omits the row for a step zero users reached, but check `beyond_retention_days` first — when retention explains the emptiness, this note's wording is softened rather than asserting zero |
| `beyond_retention_days` | How far the period reaches past the property's data retention. Present only when the retention setting is on file — its **absence is not proof the period is inside retention**. When the funnel is empty and the setting is unknown, the `note` says the check could not run; treat that as "verify with `ga4_query.py`", not as a clean bill of health |
| `reserved_total_row_indexes` | Row indexes in a `funnel_breakdown` (or a `dateRange` period comparison) whose dimension is a `RESERVED_` value. For a real breakdown dimension, `RESERVED_TOTAL` already equals the sum of the rows beside it, so adding everything up **doubles the total**; for a `dateRange` breakdown it's the opposite — a user active in more than one compared period is counted once in the total but once per period beside it, so the rows can sum to **more than** the total (measured live: neighbours 47+42 against a total of 75). `RESERVED_(other)` is a third case — the collapsed long tail, which belongs in a total but cannot be broken down further. Never report any of them as a category |
| `missing_dates_by_step` (on `funnel_visualization`) | `{step name: [missing YYYYMMDD, ...]}` for a **TRENDED** funnel's per-step daily trend (`funnelStepName` x `date`). Same cause as `find_missing_dates` on a regular report — GA4 drops a day's row entirely when zero users reached that step that day — but computed per step rather than pooled across steps, since a date present for one step's trend does not mean it was present for another's. Measured live: a 2-step 14-day TRENDED funnel had step 1 missing 4 of 14 days with no note before this was added. A top-level pointer names the affected step(s); the days themselves are in this key and in `funnel_visualization`'s own `note` |
| `metadata` (on either sub-report) | `{"sampling": true}` when GA4 answered that sub-report from a sampled subset. `FunnelSubReport` carries its own metadata — only `sampling_metadatas`, unlike a regular report's seven fields — and it used to be dropped during shaping, so a sampled funnel presented estimates as exact counts with no warning anywhere. It now runs through the same `_add_response_metadata` the other reports use, which also raises a **top-level** pointer (above the reserved-total and missing-date pointers: those say how to read a number, this says whether it can be quoted as exact at all) and makes `missing_dates_by_step` refuse — a gap in a sampled response may be a row that never came back rather than a day with a real zero |
| `note` | A human-readable explanation of the above |

Don't assert `steps_without_data` means "zero users" as fact — the API didn't say "zero", it simply
had no row. GA4 omits a step with zero reaching users, so that's usually the correct interpretation,
but when reporting, distinguish the observed fact (no row) from the conventional interpretation
(zero users).

> A missing step is **not guaranteed to be a trailing run.** An open funnel (`is_open_funnel: true`)
> can have zeros only in the middle, with data present in later steps (observed). The script
> identifies actual missing steps using the `"N. "` number in each row label, so the names in
> `steps_without_data` can be trusted as-is.

> Warning: **on a breakdown funnel, the absence of `steps_without_data` still means "not
> confirmed", not "nothing missing"** — but not because the check is skipped. `step_names` is
> now always passed (it used to be withheld for any breakdown funnel, which left an *empty*
> breakdown funnel with no explanation at all). The guard is in the detection itself: a
> populated breakdown table has several rows per step — one per breakdown value, sometimes plus
> `RESERVED_TOTAL` rows — so the 1:1 label-to-step correspondence it needs doesn't hold and it
> abandons the determination rather than name the wrong step. An empty breakdown funnel *does*
> now populate the key. To confirm empty steps on a populated one, query again without breakdown.
