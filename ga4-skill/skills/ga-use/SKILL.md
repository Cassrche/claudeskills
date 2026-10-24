---
name: ga-use
description: Use when the user wants to analyze or query GA4 (Google Analytics 4) data — event counts, users, sessions, page views, top-N rankings, filtering by dimension/metric, and period-over-period comparisons via the Data API runReport. Consumes .ga4/config.json + token.json from the ga-auth skill and optionally .ga4/taxonomy.md from ga-taxonomy.
---

# GA4 Analysis & Query Skill (ga-use)

Answers a marketer's natural-language analysis request with a GA4 Data API report.
Deterministic work is done by the Python in `scripts/`; you handle the request-to-query
mapping and the interpretation of results.

## Language
Respond in the user's language. If the user writes in Korean, answer in Korean;
if in English, answer in English. This applies to every step — setup guidance,
progress updates, results, and error explanations.

Never translate: GA4 API identifiers (`eventCount`, `sessionSource`, `runReport`),
file and directory names (`.ga4/token.json`), shell commands, and JSON field names.

**Script output is never shown to the user as-is.** Scripts always emit English
`error`/`hint` strings. When a script returns `"ok": false`, you MUST rewrite the
`hint` into the user's language before showing it. Never paste the English
through, and never show the raw JSON. Keep identifiers, paths, and commands
verbatim inside your rewritten text — translate only the prose around them.

Example — script returns:
  {"ok": false, "hint": "token.json is missing. Log in first with the ga-auth skill."}
To a Korean-speaking user, say:
  로그인 정보(.ga4/token.json)가 없어요. ga-auth 스킬로 먼저 로그인할게요.
Not: "token.json is missing. Log in first with the ga-auth skill."

## Interpreter Rules
- `ga4_query.py`, `ga4_realtime.py`, `ga4_pivot.py`, `ga4_cohort.py`, `ga4_funnel.py`, `ga4_metadata.py`: **must run with `.ga4/venv/bin/python`** (requires google-analytics-data)
- `{SKILLS_DIR}` = the directory these ga skills are installed in — the parent of this skill's
  directory (`.claude/skills` in a Claude Code project; other agents use their own location).
  Substitute the actual path. Run commands from the project root.

## Step 0: Status Check (always first)
Check `.ga4/` to decide where to enter:
- Does `config.json` (`property_id`) + `token.json` exist? If not, guide the user to **connect
  with the ga-auth skill first**.
- Are the libraries ready? If `deps_ready` from `python3 {SKILLS_DIR}/ga-auth/scripts/ga4_status.py`
  is `false`, **this skill runs the accompanying `deps_fix` command itself** ("I'll install the
  libraries this analysis needs") and re-checks before proceeding — don't ask the marketer to
  run pip. If `null`, the check itself failed; don't assume the deps are missing, just proceed.
- Does `taxonomy.md` exist?
  - **If it does**, read it and map the request to events/parameters.
    Use the **Query Name column** in the parameter table as-is — `method (standard)`
    means query `method` with no prefix, `(metric)` means it belongs in `metrics`, and
    `Not registered — cannot query` means don't query it and tell the user it needs to be
    registered first. Guessing `customEvent:` from the name alone raises a 400.
    **`Reserved name — cannot be registered or queried` is different: do not ask for it to be
    registered.** GA4 refuses reserved names and prefixes (`user_id`, `session_id`, anything
    starting with `google_`/`firebase_`/`ga_`/`_`), so the request would be rejected and the
    value is never queryable through the Data API. Say that plainly instead of routing the
    marketer to their administrator.
    **`customEvent:x — prefer standard y` means use `y`.** GA4 has a standard field for
    that parameter, and a custom definition holds no data from before it was registered —
    so the custom one silently drops earlier periods that the standard field covers in
    full. Only fall back to the `customEvent:` name if the standard one returns nothing.
    Older `taxonomy.md` files may still carry the Korean labels with the same meanings
    (`조회명` = Query Name, `미등록 — 조회 불가` = Not registered) — re-parsing the sheet
    with ga-taxonomy refreshes them to the English labels.
  - **The taxonomy sheet describes what is supposed to happen, not what actually happened.**
    Before building on a mapped event, check how much it actually fired in the requested
    period (one `eventName` × `eventCount` query is enough). In practice, 14 of 31 taxonomy
    entries had zero hits in the last 30 days, and some stayed single digits even over
    90 days — building a funnel without knowing that leads to confidently reporting a
    meaningless number like "1 of 3 completed → 33% completion rate." When the sample is
    small, report the **raw count instead of a percentage** and say so.
  - **If it doesn't exist**, first survey the event landscape before analyzing: query
    `eventName` × `eventCount`/`activeUsers` with `limit` 50 or higher to see what events
    this property has, then map the request. If the response has `truncated: true`, raise
    the limit and query again (missing events can mean missing a core behavior entirely).
- Does `custom_definitions.json` exist? (created by ga-taxonomy)
  - **If it does**, read it. Use it to translate the taxonomy's parameters into their
    actual query names (`customEvent:...`) and units — see the "Custom Definitions"
    section of `references/analysis-guide.md` for details.
  - **If it doesn't**, you can find entries starting with `customEvent:`, `customUser:`,
    or `customItem:` in the `ga4_metadata.py get-metadata` result and use them the same way.

## Platform Context

The status check reports `platforms` — which platforms this property collects
from, in GA4's own spelling (`web`, `iOS`, `Android`, or `unknown`). It changes
which events and dimensions can exist at all, so read it before concluding
anything is missing.

- **`null` means it was never looked up. Do not assume a platform.** Guessing
  one is the exact failure this field exists to prevent. Re-run
  `.ga4/venv/bin/python {SKILLS_DIR}/ga-auth/scripts/ga4_admin.py get-property <PROPERTY_ID>`
  and save it through the ga-auth skill's **Step 4's items 4 and 5**: the save
  rebuilds `config.json` from scratch, so currency, timezone and retention must
  be passed again in that same command or they drop to `null` — which costs
  ga-use the currency it reports revenue in (realtime responses carry no
  metadata at all) and the retention value behind its empty-funnel check.
- **`[]` means the property has no data streams** — it is collecting nothing.
- **An `unknown` entry means a stream could not be classified**, so the list is
  not a complete answer. Do not read a missing `web` as "app-only" while
  `unknown` is present: say the property could not be classified rather than
  applying a web-only or app-only judgement to it.
- **If `platforms_age_days` is over 180**, the list may predate a platform the
  team has since added. Re-check before relying on it.
- `platforms` is which streams are **configured**; the `platform` dimension is
  which traffic **actually arrived**. A configured stream can still have zero
  data, so do not state one as if it were the other.

## Analysis Flow
1. Confirm what analysis is needed (metrics, period, breakdown dimensions, filters).
2. **If it's a compound question** (matching one of the question types in the recipes —
   conversion analysis, path/journey, performance summary (overview), diagnosing a change,
   content performance, or comparing behavioral importance), read
   `references/analysis-recipes.md` first and plan the query (what/why/how to combine).
   For analyses where **the target count can be small** (conversions, segments), check the
   scale first, and set the analysis depth per the sample-size gate in
   `references/analysis-recipes.md`.
3. Map the request to actual event/parameter names — using what Step 0 gathered
   (`taxonomy.md`, or the queried event list if there was none).
4. If dimensions/metrics are uncertain, query the metadata — **narrow it with `--search`**:
   ```bash
   .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_metadata.py get-metadata --search item
   ```
   A property exposes ~400 dimensions and ~120 metrics, so the unfiltered dump is roughly
   12k tokens; a single-field lookup with `--search` is about 150. `--search` is repeatable
   (entries matching any term are kept) and matches the API name or the UI name. `--kind
   dimension|metric` drops the other list. A filtered response carries a `filtered` key with
   the unfiltered totals — if that key is present, you are not looking at the whole catalogue.
5. Build the extended JSON spec and query (format in `references/analysis-guide.md`):
   ```bash
   echo '<request JSON>' | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_query.py
   ```
6. Refine the result into a table or summary and answer. On an empty result or error,
   work around it per the retry loop in `references/analysis-recipes.md`.
   **If `truncated` is true**, you only saw the top slice — don't describe it as "the
   total"; either raise `limit` and query again, or state that it's "based on the top N."
   If a funnel result has `steps_without_data`, that step **had no row in the response**
   (GA4 omits steps with zero reach, so it usually means zero — but don't assume, pass
   it along as-is).

## Working Principles (critical)
The audience is **non-technical marketers**:
- Break work into small steps, and explain "what/why" in one line at every step.
- Handle file placement and command execution yourself whenever possible.
- Translating natural language into a JSON spec is Claude's job — never ask the
  marketer for JSON.

## Common Request Patterns
- **Top-N**: `order_bys` (desc) + `limit`. Example: top 10 events by count. (Pivots are
  per-axis, so this goes in `pivots[].order_bys` / `pivots[].limit`.)
- **Sorting by `dimension` uses GA4's lexical order, not numeric or calendar order.**
  `hour`/`minute` are unpadded, so this script requests NUMERIC order type for those two
  automatically — no action needed. `dayOfWeekName` and `appVersion` have the same problem with
  **no server-side fix** (text and multi-part strings respectively; NUMERIC order type does not
  help either — measured live for both), so a `note` warns instead: for `dayOfWeekName`, sort by
  `dayOfWeek` (0=Sunday..6=Saturday) and keep the name for display; for `appVersion`, there is no
  substitute dimension — sort the returned rows yourself by parsing each version's dot-separated
  parts as integers. Any other numeric-looking dimension (including custom ones) can have the same
  problem — see `references/analysis-guide.md` for the full list of what's safe.
- **Do not sum rows to get a total.** Metrics ending in `~Users` and `sessions` are
  deduplicated values — summing per-dimension rows inflates them beyond the real total
  (measured on a live property: summing daily `activeUsers` over a month came out 13% above
  the true total). Rates and averages are unsafe to sum for a different reason: they were
  never deduplicated, the arithmetic of summing/averaging them across rows is simply invalid.
  If the response carries `non_additive_metrics`/`note`, this applies — the note explains
  which reason applies to which metric rather than blaming deduplication for all of them.
  If you need a total, **query once more** with the same period but no `dimensions`.
  Count-type metrics like `eventCount` can be safely summed.
- **`totalUsers` and `activeUsers` are not interchangeable.** `totalUsers` counts any user who
  logged an event; `activeUsers` requires an engagement signal, so the two commonly differ
  (measured live: 99 vs 124 over the same period, a 25% gap). GA4's own `*PerUser` metrics
  (`sessionsPerUser`, etc.) divide by `activeUsers`, not `totalUsers` — don't hand-compute a
  "per user" figure against `totalUsers` and call it more correct; use the metric GA4 already
  provides, or `activeUsers` if you must divide by hand.
- **`dauPerMau`/`dauPerWau`/`wauPerMau` break the "no dimensions = safe total" rule
  above.** These are rolling day-by-day ratios, and over a period longer than one day
  GA4's own no-dimension aggregate is a **sum of the daily values**, not a period ratio
  — measured live, exactly (a 6-day query's no-dimension total matched the same days
  summed by hand to double-precision). If the response carries a note naming one of
  these, request the metric for a single day instead, or break it out by `date` and
  read each day on its own.
- **A revenue-based expression metric can come back as the raw revenue, not the ratio.**
  An expression like `totalRevenue/eventCount` (average order value) requested on its own
  returns `totalRevenue` itself unless `totalRevenue` is also listed in `metrics` (measured
  live — GA4 evaluates the expression only once the revenue metric is present). If the
  response carries `expression_revenue_operands`, re-query with that revenue metric added;
  a "ratio" that reads like a large total is this trap. Expressions over non-revenue
  metrics (`eventCount/sessions`) are unaffected. The auto-check only catches metrics ending
  in `Revenue` — other money metrics (`itemRefundAmount`, `advertiserAdCost`) aren't flagged,
  so request them alongside the expression too.
- **Always state the currency with revenue.** The response's `metadata.currency_code` is the
  property's reporting currency — **never assume it matches the country or the language you
  are speaking.** A live property on `Asia/Seoul` time reports in USD; reading those figures
  as won is out by roughly 1300x, and nothing else in the response hints at it.
  `metadata.time_zone` is the property's timezone, which is what "today" resolves against.
- **`metadata` can say the numbers aren't quotable.** `sampling: true` means they are
  estimates from a subset — say so, and don't call small gaps between them real.
  `subject_to_thresholding: true` means GA4 withheld rows for privacy, so totals are a lower
  bound. `data_loss_from_other_row: true` means values were collapsed into `(other)` and the
  breakdown is missing an unknown tail.
- **A sampled expression can corrupt its raw operand.** If a sampled response carries
  `expression_sampling_overlap`, an **event-scope** revenue metric (`totalRevenue`,
  `purchaseRevenue`) requested both raw and inside an expression (e.g. `totalRevenue/eventCount`)
  came back far smaller than its true total (measured ~13x off). Don't quote that raw column from
  this response — re-query it without the expression, or narrow the query so sampling doesn't
  trigger. (Item-scope `itemRevenue` and count metrics don't drift and aren't flagged.)
- **A daily (or monthly) series can be missing rows.** GA4 drops a row when every requested
  metric is zero for it, so a zero-sales day vanishes from a revenue-by-`date` query — and the
  same happens one granularity up for a `yearMonth` breakdown (measured live: a 12-month
  subscription-revenue query returned only 4 of 12 months). If the response carries
  `missing_dates`, those rows are **real zeros**, not missing data — include them when
  averaging (dividing by the returned rows alone runs high) and don't let a trend line join
  across them.
- **`(not set)` is not a category.** If the response carries `unset_dimensions`, GA4 received
  no value for those rows. Never report it as the top item — on a live property "top coupons
  by revenue" ranks `(not set)` first, meaning "no coupon was used". When a dimension is
  listed under `fully_unset`, no row has a value at all: the event fires but the app or site
  never attaches that parameter, so report a tracking gap rather than a breakdown.

  **Before calling `fully_unset` a tracking gap, check the platform.** A dimension
  that does not apply to this property's streams comes back entirely `(not set)`
  even when the implementation is perfect. The response already does this check
  itself when config.json's `platforms` is on file, across **24 dimensions**: the
  web-stream side is the 9-member page family, `browser`/`browserVersion`, and the
  whole 12-member Enhanced Measurement family (outbound click, file download,
  video, scroll); the app-stream side is `appVersion`. Those are listed separately
  under `unset_dimensions.platform_mismatched` and the `note` says "expected, not a
  tracking gap" instead of blaming the app or site.

  Still apply the reasoning below yourself in the three cases the check stays
  silent on: when `platforms` isn't on file at all; when it contains `unknown`
  (a stream that could not be classified means the list isn't a complete answer,
  so no web/app judgement is applied — see the `platforms` notes above); and for
  a fully-unset dimension outside those 24 (`unifiedScreenName` included — it's
  cross-platform, so a real gap there stays unflagged, as do `searchTerm` and the
  `contentGroup` family, which need manual instrumentation on either platform).

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

- **A zero can mean "never tracked".** If the response carries `uninstrumented_metrics`,
  the metric reads 0 because the event behind it has never been recorded on this property —
  not because nothing happened. Report it as a tracking gap ("the app or site never sends the
  `refund` event"), **never as a business result** ("there were no refunds"). The second one
  ends the conversation with a false fact the marketer will act on. The key lists every event
  that could fill the metric — quote the list, since a purchase on an app arrives as
  `in_app_purchase`, not `purchase`. If the event inventory on file is stale the note hedges
  ("may mean not tracked") and asks to refresh it; pass that hedge through rather than
  reporting a certainty the data cannot support.
- **A metric can also read 0 because its stream type doesn't exist here — a third
  reading, distinct from "never tracked."** `scrolledUsers` (and any future metric like
  it) depends on a web-only GA4 Enhanced Measurement event with no app-stream
  counterpart, so on an app-only property it can never be anything but 0 — not a
  tracking gap someone could fix by adding an event, and not a business zero. If the
  response carries `platform_mismatched_metrics`, say so explicitly rather than
  reaching for either of the other two framings.
- **Purchase revenue beside zero purchases is subscription revenue.** If a
  `purchaseRevenue`/`grossPurchaseRevenue` is non-zero while every requested
  purchase-count/purchaser metric is 0, the response carries
  `subscription_revenue`. On app-store subscription apps GA4 counts the
  `app_store_subscription_*` events into revenue and into `transactions` but
  not into the purchase counts — so the zeros are by design, not a data gap.
  Report the revenue as recurring subscription revenue, and **do not compute
  an average order value from it**: `purchaseRevenue/ecommercePurchases`
  comes back 0 for this shape and would read as zero-priced orders.
- **An empty funnel may be data retention, not zero conversions.** Retention limits funnels
  and explorations but **not** standard reports, so a period past it makes `ga4_funnel.py`
  return zero rows with no error while `ga4_query.py` answers the same period normally.
  Measured on a 14-month property: a January-2025 funnel gave nothing, `runReport` gave 783
  `add_to_cart` and 136 `purchase`. If the response carries `beyond_retention_days`, say the
  funnel cannot reach that far and verify the events with a query — **never report it as zero
  conversions**. The `steps_without_data` note itself is already softened when this applies
  (it no longer flatly says "usually means zero users"), but still lead with the retention
  explanation rather than the missing-steps one. **The absence of `beyond_retention_days` is
  not an all-clear** —
  it is also absent when the retention setting was never recorded. An empty funnel then
  carries a note saying the check could not run; pass that on and verify with `ga4_query.py`
  rather than reporting a zero. Re-selecting the property with ga-auth records the setting.
- **A funnel breakdown carries aggregate rows.** If the response lists
  `reserved_total_row_indexes`, those rows are not categories. For a real breakdown dimension
  (`funnel_breakdown`), a `RESERVED_TOTAL` row already equals the sum of the rows beside it, so
  adding everything up **reports double the real total**. For a period comparison (2+
  `date_ranges`, `dateRange` header) it's the opposite: a user active in more than one compared
  period is counted once in the total but once per period beside it, so the rows can sum to
  **more than** the total — do not expect them to match either way, just exclude the aggregate
  rows from any ranking or share-of-total you present. A `RESERVED_(other)` row is a third case —
  the collapsed long tail, which belongs in a total but cannot be broken down further.
- **The last two days are still moving.** GA4 keeps processing for 24-48 hours, so a period
  ending at `today` or `yesterday` will change. If the response carries `unsettled_ranges`,
  **never report a recent dip as a real decline** — say the data is still settling, or end the
  period at `2daysAgo`. "Yesterday's revenue fell 30%" is the classic version of this: the
  marketer pauses a campaign over a number that will be higher tomorrow.
- **Period comparison**: give `date_ranges` two periods and a `dateRange` column shows the
  per-range comparison. **Make the two periods the same length and end the recent one at
  `yesterday`, not `today`** — `7daysAgo..today` is 8 days against `14daysAgo..8daysAgo`'s 7,
  and today is still in progress, so an "up/down X%" between them is partly just the extra
  day. The response carries `date_range_lengths` and warns when they differ. If you also
  break down by `date`, GA4 returns every date against every range and fills `0` outside
  each one — those zeros are "not in this period", so never average over all returned rows.
- **Filters**: `dimension_filter` (compound and/or/not, partial match, lists), `metric_filter`
  (numeric conditions).

## Realtime Snapshot (last 30 minutes)
Use `ga4_realtime.py` for realtime questions like "who's active on the app or site right now"
or "what just happened" (a separate endpoint):
```bash
echo '<request JSON>' | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_realtime.py
```
- `minute_ranges` can narrow the window (omit for the last 30 minutes).
- Realtime has a **limited set of valid dimensions/metrics** (country, deviceCategory,
  eventName, minutesAgo, etc. / activeUsers, eventCount, keyEvents, screenPageViews). Most
  standard report dimensions/metrics aren't available in realtime.
- Of those metrics, **`activeUsers` combines with none of the others** (eventCount,
  keyEvents, screenPageViews all fail paired with it, while they combine freely among
  themselves). The script rejects the pairing locally — split it into two realtime
  queries and report the numbers side by side.
- Filter/order syntax is the same as `ga4_query.py` (`references/analysis-guide.md`), but
  **`date_ranges`/`offset` don't exist** — passing them is blocked as an error (use
  `ga4_query.py` for past periods).

## Crosstab (Pivot Report)
Use `ga4_pivot.py` for two-or-more-axis crosstab analysis, like "by country × device" or
"cross-tabulated by channel and device":
```bash
echo '<request JSON>' | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_pivot.py
```
- Each item in the `pivots` array is one axis (`field_names`, `limit`, `order_bys`,
  `metric_aggregations`). Axis dimensions must also be listed in the top-level `dimensions`.
  **GA4 requires a `limit` on every axis** — omitting it is a 400, not an unbounded result —
  so a missing `limit` is defaulted (single axis: GA4's recommended 10000; several axes:
  scaled down so the product of all limits stays under GA4's 250000 cap); set it explicitly to
  bound an axis (e.g. `5` for top-5). If an axis has more values than its limit,
  `pivot_axes[].truncated` says so.
- Requesting `metric_aggregations` (`TOTAL`, `MINIMUM`, `MAXIMUM`, `COUNT`) adds `aggregates`
  rows (totals, etc.) to the response — but only when `pivots` has 2 or more entries. Confirmed
  in practice: with a single pivot, GA4 silently returns no `aggregates` at all (no error). Add a
  second pivot over any dimension to unlock it. If you request `metric_aggregations` on a single
  pivot, the response now carries a `note` saying the total was silently dropped and how to fix
  it — don't hand-sum the rows for the total instead. The note states why: a truncated axis
  (the common case — see `pivot_axes[].truncated`) means the rows don't cover every value in
  the first place, and a deduplicated metric (users, sessions) would come out too high even
  on an untruncated axis; it names whichever actually applies rather than always blaming
  deduplication.
- The response's `pivot_axes` is **per-axis** truncation info (`returned_values`,
  `total_row_count`, `truncated`, in the same order as `pivots`). If any axis was truncated,
  the top-level `truncated` also becomes true, so describe that axis as "based on the top N"
  rather than "the total." `returned_values` is the count of **values** on the axis, which
  differs from the top-level `row_count` (the cross-product row count). When an axis has
  multiple dimensions, `total_row_count` is the count of **combinations** — see
  `references/analysis-guide.md` for how to describe this.
- Filter syntax is the same as `ga4_query.py`, but **ordering and row limits are per axis**
  (`pivots[].order_bys`, `pivots[].limit`). Top-level `order_bys`/`limit` cannot be used —
  passing them is blocked as an error.

## Cohort (Retention) Report
Use `ga4_cohort.py` for retention questions like "how many of the users who signed up in
the first week of June come back, week by week":
```bash
echo '<request JSON>' | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_cohort.py
```
Shorthand (single-cohort) example:
```json
{
  "granularity": "WEEKLY",
  "date_range": {"start_date": "2026-06-01", "end_date": "2026-06-28"},
  "offsets": {"start": 0, "end": 4},
  "dimension": "firstSessionDate",
  "accumulate": false
}
```
- `granularity` (DAILY/WEEKLY/MONTHLY), `date_range` (the cohort acquisition period), and
  `offsets` (the elapsed window to observe, `{start,end}`) are required. **Offsets count from
  the acquisition week (week 0), so they can't be negative, and `start` must be `<= end`** —
  an inverted window matches no week and GA4 answers it with zero rows and no error, which
  reads as "no retention"; both are now caught locally. `dimension` (default
  `firstSessionDate`) is optional. **`accumulate` must stay false** — `true` requires
  `runPivotReport`, which this script never uses, so GA4 always rejected it; it is now caught
  locally. Add up `cohortActiveUsers` across offsets yourself for a cumulative total.
- To compare multiple cohorts at once, use full control and specify `cohort_spec`
  (`cohorts`, `cohorts_range`, `cohort_report_settings`) directly.
- The `cohort`/`cohortNthDay/Week/Month` dimensions and the default metric
  (`cohortActiveUsers`) are auto-injected. **Top-level `date_ranges` is forbidden** —
  cohorts use `date_range`/`cohort_spec`.
- Filter/order syntax is the same as `ga4_query.py` (`references/analysis-guide.md`).
- **Dates must be absolute (`2026-06-01`) only.** The relative dates other reports accept
  (`28daysAgo`, `today`) are rejected by GA4 for cohorts.
- **A requested offset whose window hasn't fully elapsed yet may come back with no row at
  all** — indistinguishable from zero return users. The response's `note` says so when this
  applies (e.g. offset 3 of a weekly cohort whose week 3 is still in progress); don't report
  a missing recent offset as "0% retention."

## Funnel (Conversion/Drop-off) Report

Use `ga4_funnel.py` for ordered-step analysis like "step-by-step conversion/drop-off from
page_view → add_to_cart → purchase":
```bash
echo '<request JSON>' | .ga4/venv/bin/python {SKILLS_DIR}/ga-use/scripts/ga4_funnel.py
```
Shorthand example:
```json
{
  "steps": [
    {"name": "Page view", "event_name": "page_view"},
    {"name": "Add to cart", "event_name": "add_to_cart"},
    {"name": "Purchase", "event_name": "purchase"}
  ],
  "date_ranges": [{"start_date": "28daysAgo", "end_date": "yesterday"}],
  "funnel_breakdown": {"dimension": "deviceCategory", "limit": 5}
}
```
- `steps` (at least 2) each define exactly one of `event_name` / `field` (+`value`|`in_list`)
  / `filter_expression` (full control).
- `funnel_breakdown` (optional) splits step drop-off by a specific dimension (device,
  channel, etc.). **A breakdown can come back entirely `(not set)`** — the event fires
  but the app or site never attaches that parameter. If a sub-report carries
  `unset_dimensions.fully_unset` (or the top-level `note` names a tracking gap), that
  breakdown carries no information: report it as missing instrumentation, **not** as a
  conversion result. (The aggregate `RESERVED_TOTAL` rows mixed into a breakdown are
  excluded from this check; they are listed under `reserved_total_row_indexes`.)
  `funnel_visualization_type` (default `STANDARD_FUNNEL`; use `TRENDED_FUNNEL` for a
  time-series trend) decides whether `funnel_visualization` carries a `date` axis — **both
  sub-reports are filled either way** — see `references/analysis-guide.md` for details. **A TRENDED funnel's daily trend can be
  missing rows per step**, the same "GA4 drops a zero row" issue as a plain daily
  series (see the bullet above) — check `funnel_visualization.missing_dates_by_step`
  (or the top-level `note`) before averaging or charting the trend.
- **`date_ranges` with 2 entries compares two periods**, the same as `ga4_query.py` —
  GA4 attaches a `dateRange` dimension and treats it exactly like `funnel_breakdown`
  (verified live), aggregate rows and all: expect `RESERVED_TOTAL` rows and apply the
  same "exclude before totalling" guidance above. **Combining this with
  `funnel_breakdown` also works** (verified live) — the two axes cross-product
  (step × your breakdown × dateRange), and `reserved_total_row_indexes` correctly
  catches a row that is RESERVED_TOTAL on *either* axis, no special handling needed.

## File Locations
- `config.json` (`property_id`) and `token.json` are created and owned by the **ga-auth skill**.
- `taxonomy.md` is created by the **ga-taxonomy skill**.
- The `GA4_DIR` environment variable can change the `.ga4` location (default: `<cwd>/.ga4`).
