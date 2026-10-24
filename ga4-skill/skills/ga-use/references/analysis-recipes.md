# Analysis Recipes — A Guide to Question Decomposition, Extraction, and Recombination

ga-use's purpose isn't to act as an API-call proxy — it's to **answer analysis
questions**. When you get a compound question (one that can't be answered with a
single query), follow the methodology in this doc. For individual query syntax, see
`analysis-guide.md`.

## Decomposition Principles

1. Before executing, **plan the query first**: list out which queries to run, why,
   and how to combine the results.
2. Discover the unknowns first. For concepts that vary by property, like "conversion"
   or "key event," run a **definition-discovery query** first.
3. Don't try to cram everything into one query. Summary and breakdown, discovery and
   verification are different queries.
4. **Check the sample size first.** Before starting the breakdown, query the scale of
   the target (e.g. conversions), and if it's small, lower the analysis depth itself.
   Disclose the sample-size caveat **up front**, not after the analysis is done.

   | Target N | What's allowed |
   |---|---|
   | N < 10 | No ratio/multiplier calculations. State "too few cases to judge a trend" and report only the raw count |
   | 10 ≤ N < 30 | Direction only ("A is higher than B"). No decimal-point multipliers or definitive rankings |
   | 30 ≤ N < 100 | Multipliers allowed, but as rough ranges. Avoid breaking down 3+ segments at once |
   | N ≥ 100 | Proceed with the usual breakdown |

   Anti-pattern (real case): stacked 7 funnels on top of 14 converters and computed
   "3.9x / 4.2x." That's expressing the difference between 4 and 3 people as a
   multiplier, and the sample limitation was only mentioned after the analysis was done.

## Recipes by Question Type

Each recipe: example trigger → query sequence → how to combine.

### Conversion Analysis ("How much are we converting?", "What leads to conversion?")
1. **Discover the conversion definition**: query `eventName` × `keyEvents` to see what
   this property's key events are.
2. **Segment breakdown**: break down the discovered conversion event(s) by whatever
   dimension fits the request's context — channel, device, page, etc.
3. (If it's a sequence question) **Funnel verification**: verify the hypothesized
   order with `ga4_funnel.py`.
- Combine: always report the conversion count together with "what counts as a
  conversion." Compute ratios via expression (see the recombination rules below).

### Path/Journey Analysis ("What pages do people go through before converting?")
Path Exploration isn't available in the Data API (see the limitations section below).
Instead, answer with **both endpoints + funnel verification**:
1. **Entry point**: `landingPagePlusQueryString` × `keyEvents`/`sessions` — where
   converting sessions landed.
2. **Endpoint**: `pagePath` × `eventName` (filtered to the conversion event) — which
   page the conversion happened on.
3. **Verify the sequence hypothesis**: confirm the hypothesis built from 1 and 2 (e.g.
   entry → content view → conversion) with a funnel.
- Combine: state clearly that only "the order within the same session" is verified,
  and point to GA4 UI exploration for cross-session journeys.
- **App-only or mixed property**: `landingPagePlusQueryString` and `pagePath` are
  web-stream dimensions — on an app-only property both read 100% `(not set)` (the
  response's `unset_dimensions.platform_mismatched` says so), not a tracking gap. Use
  `unifiedPagePathScreen` for step 1 and `unifiedScreenName` for step 2 instead — see
  SKILL.md's Platform Context section for the full web/app/mixed breakdown, including
  why `unifiedScreenName` being unset (unlike the page family) usually *is* a real gap
  worth reporting, since apps commonly send screen tracking via custom events instead.

### Performance Summary ("How was last week?", "Give me an overview")
1. **Summary query**: key metrics with no dimensions (`totalUsers`, `sessions`,
   `screenPageViews`, `eventCount`).
2. **Breakdown query**: top-N events, or a breakdown by a dimension that fits the
   request's context (device, channel).
- Combine: lead with the summary numbers, then surface notable patterns from the
  breakdown (skew, outliers) as insights.

### Diagnosing a Change ("Why did it drop?", "Compare it to last month")
1. **Period comparison**: two `date_ranges` (the periods to compare) to compare
   overall metrics — which metric changed.
2. **Repeat the drill-down**: for the metric with the biggest change, repeat the
   period comparison while swapping dimensions in order — channel → device → page —
   to narrow down the segment where the difference concentrates.
- Combine: attribute it in the form "X dropped Y%, and most of that came from
  [segment]."

### Content Performance ("Which articles are doing well?")
1. **Page metrics**: top-N `pagePath` × view/user metrics.
2. **Combine with behavior**: check depth of consumption via events that occurred on
   the top pages (`pagePath` filter + `eventName` breakdown).
- Combine: interpret view count (quantity) and behavior events (quality) side by side.
- **App-only or mixed property**: swap `pagePath` for `unifiedScreenName` (screens) in
  both steps — `pagePath` reads 100% `(not set)` there, which is a platform mismatch,
  not a tracking gap (see the Platform Context section of SKILL.md). If the app's
  content lives behind a custom event parameter instead of a screen name (e.g. a
  content-ID parameter registered via ga-taxonomy), prefer that over `unifiedScreenName`
  — it names the specific item, not just the screen it was viewed on.

### Comparing Behavioral Importance ("What's the most important behavior before conversion?", "What has the biggest impact on conversion?")
1. **Confirm the conversion definition and scale**: query the conversion event and its
   count/user numbers, and apply **the sample-size gate** (Decomposition Principle 4).
2. **Surface candidates**: top-N `eventName` × `eventCount`/`activeUsers`. If the
   response's `truncated` is true, raise `limit` to make sure no candidate was missed.
3. **Two-step funnel per candidate**: run `ga4_funnel.py` for each candidate →
   conversion, and collect `funnelStepCompletionRate`.
4. **Lift over baseline**: divide by the overall conversion rate (converters ÷ total
   active users) to rank the candidates.
5. **Remove confounding (don't skip this)**: check whether the top candidates overlap
   with each other. If both A and B rank high, check the containment relationship with
   an `A → B → conversion` 3-step funnel, or query how much B occurs among the users
   who reached A. **Skipping this step double-counts the same behavior and distorts
   the ranking.**
- Combine: report the lift ranking together with the overlap between candidates and
  the sample limitations. This method shows correlation, not causation — describe it
  as "behavior that converters went through," not as "the cause that drove
  conversion."

Anti-pattern (real case): reported a ranking assuming `nav_click` (4.2x) and
`ga_landing_view` (3.9x) overlapped, without actually checking the intersection. Step
5 exists to prevent exactly that omission.

## Iteration Loop (When You're Stuck)

Queries rarely come out right on the first try. **Decide the next query based on the
result.**

- **If the API rejects it**: read the error message and work around it with a
  different dimension/approach. Real case — putting `pagePath` in a funnel step
  throws a 400 error ("not supported inside funnel steps"). → Rebuild the funnel by
  **proxying with an event that represents the page view** (e.g. `blog_article_view`).
- **If the result is empty**: widen it in this order — expand the period → relax the
  filter → swap the dimension.
- **If the numbers look off**: first suspect the pitfalls in the recombination safety
  rules below (aggregation mismatch, `(other)`, unit confusion).

## API Limitations and Workarounds

| What you can't do | Alternative strategy |
|---|---|
| Path Exploration (reconstructing the raw page sequence) | Both endpoints (landing/conversion page) + funnel hypothesis verification. Point to GA4 UI exploration for cross-session journeys |
| Page dimensions in funnel steps (`pagePath` causes a 400; no general rule for which others are excluded) | Proxy with an event that represents the page, or use a custom event parameter instead — those work fine as a step `field` (verified live, e.g. `customEvent:dol_type`), the restriction is specific fields, not "non-event dimensions" generally |
| Raw session/user-level data | Answer with aggregated results, and point to a BigQuery integration if raw-level data is needed |
| Most standard dimensions in realtime | Only use the valid realtime dimension/metric list in `analysis-guide.md` |

## Recombination Safety Rules

When combining numbers from multiple queries:

1. **Aggregation mismatches are normal**: breaking down by dimension can make the
   total differ slightly from the summary query (user metrics are approximate
   aggregates, so the gap widens with higher cardinality). This isn't a mistake —
   disclose it and move on.
2. **`(other)` and thresholds**: high cardinality gets bucketed into an `(other)` row,
   and rows with few users can be hidden by privacy **thresholding**. This is the main
   reason totals "don't add up."
3. **Don't confuse units**: don't build a ratio by mixing a session metric
   (`sessions`) with a user metric (`totalUsers`). Check that the numerator and
   denominator are the same unit.
4. **Delegate ratios to the API**: if you need division, use a metric expression
   instead of computing it by hand (e.g. `{"name": "keyEventsPerSession",
   "expression": "keyEvents/sessions"}` — `runReport` (`ga4_query.py`) only, see
   `analysis-guide.md`). **If the expression divides by/uses a revenue metric
   (`totalRevenue`, `purchaseRevenue`, `itemRevenue`, …), also request that revenue
   metric in `metrics`** — measured live, a `totalRevenue/eventCount` average-order-value
   requested alone came back as `totalRevenue` itself (the raw numerator, in the
   billions), not the ratio; GA4 only evaluates the expression once the revenue metric
   is present on its own. **Then never sum the result across rows.** A computed
   ratio is a ratio per row, so adding them up is meaningless — measured on a
   live property, summing a `keyEvents/sessions` rate across nine channels gave
   0.2470 against a true overall rate of 0.0220. The response now lists any
   dividing expression under `non_additive_metrics` (it cannot be caught by
   name, since you chose the name), and warns via `expression_revenue_operands`
   when a revenue operand was left out. For an overall figure, run the same
   expression again **with no dimensions**.
5. **Joining across queries**: when combining two results, confirm they're
   aligned/matched on the same dimension key (e.g. the same `pagePath` notation).
   Also double-check that the period and filters are the same condition.
6. **Names should reflect the actual filter**: don't put conditions in a query's or
   funnel step's name that aren't actually in the filter. The name is a free-form
   string that neither the API nor the tests validate — if it's wrong, nothing will
   catch it.
   Anti-pattern (real case): a step was named "GA4 Intro (ga/introduce)," but the
   actual filter was `event_name: page_view` with no page condition at all — the
   result was really "all page views," but the report nearly labeled it as a specific
   page's performance.

## Interpretation and Communication Principles

- **State the denominator**: not "conversion rate 2.6%," but "16 conversions out of
  617 sessions that entered on the homepage (2.6%)."
- **What a closed funnel means**: funnel numbers only count "users who followed that
  exact order." If it differs from total conversions, that gap is itself an insight
  (e.g. only 3 of 25 conversions followed the funnel order → that path isn't the main
  one).
- **Disclose what wasn't seen**: state in one line what this analysis didn't cover
  (cross-session journeys, hidden rows, etc.).
- **Narrative for marketers**: a table + a "what stands out" summary. Don't just list
  numbers — attach an interpretation that leads to a next action.
