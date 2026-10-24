---
name: ga-taxonomy
description: Use when the user wants to define, parse, or manage a GA4 event taxonomy (이벤트 정의서) — turning a spreadsheet of planned events/parameters into taxonomy.json/taxonomy.md, comparing planned events against what GA4 actually collects, or drafting an initial taxonomy from live GA4 data. Consumes .ga4/config.json + token.json from the ga-auth skill for the live features.
---

# GA4 Event Taxonomy Skill (ga-taxonomy)

Helps a marketer (1) **parse** an event taxonomy from a spreadsheet, (2) **reconcile** it
against what GA4 actually collects, and (3) if starting from an empty state, **draft** one
from live data. Deterministic work is done by the Python in `scripts/`; you decide which
step applies.

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

## Working Principles (critical)
The audience is **non-technical marketers**. Follow these rules:
- **Break work into small steps.** Walk through one or two steps at a time, confirm the
  result, then move on.
- **Explain "what/why" in one line at every step.**
- **Do the heavy lifting for the user.** Handle file placement and command execution
  yourself whenever possible.
- Prefer the operational template header (9 columns), but **column names/order can differ
  slightly — the alias dictionary auto-recognizes them.** If auto-recognition is ambiguous,
  the parser emits `needs_mapping`; map the columns with `--map "original-header=canonical-field,..."`
  and re-run to correct it (this is a mapping fix, not a rejection).

- **`--map` can address a column by its spreadsheet letter** — `--map "B=up_ga4_name"` —
  which is the only way to reach a column whose header cell is blank. Header text
  wins: if the sheet really has a header named `B`, that is what the key means,
  and a letter is refused on any sheet where that column's own header already
  names a field. The response's `map_resolution` says how each key was read **on
  each sheet** (a `--map` key applies to the whole workbook, and one letter is a
  different column on every tab). Numeric indexes are not accepted, because
  0-based and 1-based are both defensible and the reader cannot tell which was
  meant.
- **A mapping only has to be given once.** It is stored with the taxonomy, so re-syncing the
  same sheet later needs no `--map` at all — just re-run with the source. The response says
  `reused_column_map` when that happened. This only applies to the **same source**: a mapping
  describes one sheet's headers, and reusing it across sheets would map the wrong columns
  without erroring. A taxonomy saved before this existed has no stored mapping, so pass
  `--map` once more and it will be remembered from then on. `--sheet` is remembered the same way.
  **A stored mapping stays in force until an explicit `--map` replaces it.** Re-running
  without the flag does not clear it, and neither does `--map ""` — an empty value parses
  to no keys at all, which is what triggers the reuse. To get rid of one, pass the corrected
  mapping, or roll the taxonomy back with `taxonomy_restore.py`.

## Interpreter Rules
- `taxonomy_diff.py`, `taxonomy_draft.py`, `taxonomy_restore.py`: system `python3` (stdlib)
- `parse_taxonomy.py`: csv uses system `python3`; **xlsx requires `.ga4/venv/bin/python`**
  (needs openpyxl); **a URL (Google Sheets) input also requires the venv** (sheets_reader
  uses the Sheets API)
- `ga4_events.py`: **must run with `.ga4/venv/bin/python`** (requires google-analytics-data)
- `sheets_reader.py`: **must run with `.ga4/venv/bin/python`** (requires the Google Sheets API)
- `custom_dims.py`: **must run with `.ga4/venv/bin/python`** (fetches metadata)
- `param_naming.py`: system `python3` (stdlib; a library module, not run directly)
- `{SKILLS_DIR}` = the directory these ga skills are installed in — the parent of this skill's
  directory (`.claude/skills` in a Claude Code project; other agents use their own location).
  Substitute the actual path. Run commands from the project root.

## Step 0: Status Check (always first)
Check `.ga4/` to pick a scenario:
- Does `taxonomy.json` already exist? (whether a taxonomy is on hand)
- Do `token.json` + `config.json` (`property_id`) exist? (whether ga-auth is connected —
  needed for the live-data features)

If not connected but a live-data/draft feature is needed, guide the user to **connect via
the ga-auth skill first**.

**Check library readiness** (the Google Sheets/xlsx paths die with `No module named ...` if
this is blocked):
```bash
python3 {SKILLS_DIR}/ga-auth/scripts/ga4_status.py
```
If `deps_ready` is `false` and `missing_packages` includes `ga-taxonomy`, **run the
accompanying `deps_fix` command yourself** (explain in one line: "I'll install the libraries
needed to read the taxonomy sheet"), re-check, then proceed. Don't ask the marketer to run pip.

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

## Scenario A: A taxonomy already exists (file or Google Sheets URL)
1. Get the input — a **Google Sheets URL** or a **local xlsx/csv path**.
2. Parse it (same command for both; a URL requires the venv python):
   ```bash
   .ga4/venv/bin/python {SKILLS_DIR}/ga-taxonomy/scripts/parse_taxonomy.py "<URL or file path>"
   ```
   - `ok:true` creates `.ga4/taxonomy.json`/`taxonomy.md`.
   - **If `replaced` is present, an existing taxonomy was replaced.** If
     `replaced.event_count` is present, compare it with this run's `event_count` — if it
     dropped noticeably (e.g. 31 -> 1), the wrong file or sheet was likely parsed. Don't just
     move on — tell the user:
     "The existing 31 events became 1. Is this the file you meant?"
     (If `event_count` is absent, the previous file was corrupted and its size couldn't be
     read, so no comparison is made.)
     - To roll back, **don't copy files by hand** — use the command below (it rolls back the
       json and md together):
       ```bash
       python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_restore.py            # list generations
       python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_restore.py -g latest  # roll back
       ```
       Use the `event_count` in the list to decide with the user which generation to go to.
       The state right before rolling back is also backed up as `undo_backup`, so even
       picking the wrong generation can be undone.
       Backups are kept for the last 5 generations under `.ga4/taxonomy_backups/<timestamp>/`.
     - If `replaced.backup` is `null`, no backup could be made (disk/permission issue).
       That means there is no way to roll back, so instead of pointing to a recovery path
       that doesn't exist, tell the user the taxonomy needs to be re-parsed from the
       original file.
   - **If `warnings` is present, work through it with the user before moving on.** Parsing
     succeeded, but each entry silently corrupts a later step if ignored.
     - `unrecognized_scopes`: the scope column was filled in with a word this parser doesn't
       know, so those parameters ended up with no scope at all. Don't guess the scope — show
       the user the exact values it couldn't read and the recognized vocabulary, have the sheet
       corrected, and re-parse. Left alone, the comparison step reports these as "scope not
       stated" and suggests adding a scope column the user already has, which reads as the tool
       being broken.
     - `case_only_duplicate_events`: see below.
     - a shared/common block warning: parameters under a "공통 매개변수"-style category that
       were attached to an event instead of kept separate. **A common block only stays
       separate when it sits above the first event** — below or between events it silently
       becomes that event's parameters, and analysis then thinks only that one event carries
       them. Have the author move the block above the first event and re-parse.
     - an unscoped items-array field warning: parameters named `item_id`/`item_name`/
       `price`/`quantity` and the like, with the scope column left blank. A blank scope
       defaults to **event**, and for these names that flips the answer rather than nudging
       it — on one real sheet the same `item_id` resolved to `itemId (standard, item scope)`
       where the scope was filled in and to `customEvent:item_id` where it was blank, and
       those are genuinely different values. Ask the author to fill in `item`, unless the
       event really is non-ecommerce and the parameter really is event-level.
     - **On an app property, the items-array warning can be wrong for
       `in_app_purchase`.** Firebase collects that event automatically and sends
       `product_id`, `price`, `quantity`, `currency`, `value`, `subscription`,
       `free_trial` and `introductory_price` as **flat event parameters** — there
       is no items array. So a blank scope defaulting to event is correct there,
       and steering the author to `item` makes `price` resolve to `itemRevenue`,
       a number that will never populate. Say this instead of relaying the
       warning. The same does not hold for a custom event the team named
       `in_app_purchase` itself — ask which it is if it is not clear.
     - a GA4 collection-limit warning: the taxonomy plans more than GA4 will collect.
       **Nothing fails at parse time — it fails months later in production, quietly.** The
       25-event-parameter one is the expensive case: Google's wording is that Analytics
       "doesn't log events" over the limit, so the **whole event disappears**, not just the
       surplus parameters. Work it out with the author before the sheet goes to developers.
     - a registry-staleness warning: the custom-definition snapshot behind every
       `Not registered — cannot query` label is old or undated. Re-fetch with
       `custom_dims.py fetch` and re-parse **before** telling the user anything needs
       registering — otherwise you send them to register what they already have, or
       hand them a name that was deleted and will 400 at query time.

     - an invalid-GA4-name warning: names that cannot be GA4 identifiers. A GA4
       name starts with a letter and holds only letters, digits and underscores,
       so a Korean label is definitively not one — this warning has no false
       positives. **Do not pass it to the user as a taxonomy problem.** The usual
       cause is a sheet that keeps the human label in one column and the GA4 name
       in another, where only the label column was recognized. Look at
       `unnamed_columns` in the same response: a column with no header and values
       like `user_grade` is the name column. Map it by its spreadsheet letter and
       re-parse: `--map "<letter>=up_ga4_name"` for user properties, `ga4_name`
       for events. The mapping is stored, so later syncs of the same sheet need
       no flag.

       **Then read the response. Do not assume the mapping landed where you meant
       it.** A `--map` key applies to every tab in the workbook, and one letter is
       a different column on every tab. Two fields report what actually happened:

       - `map_resolution` — one entry per key **per sheet**, and every entry is
         one of two kinds. `header` (it matched that sheet's header text) or
         `column <letter>` (it addressed the column by letter) means the key
         **was read there**. Anything starting with `ignored — ` means **nothing
         was read on that tab**, and the rest of the line says why:
         - `ignored — column <letter> from its own header <field>` — that column
           is already named by its own header. This is why an ordinary
           `타입`/`Type` column on a neighbouring tab is safe from the letter.
         - `ignored — column <letter> already explicitly mapped to <field>` —
           another key in the same `--map` took that column first.
         - `ignored — <field> already read from column <letter> by key <key>` —
           two keys asked for the same field on one tab; see below.
         - `ignored — no header or column on this tab matched this key` — the key
           names no header here and is not a column letter within this tab's
           width. A **number is never a column address**: `--map "2=up_ga4_name"`
           addresses nothing at all. Write the spreadsheet letter, `B`.
         - `ignored — nothing was read from this tab (<reason>)` — the tab holds
           nothing of that kind to collect (or `--sheet` points at another tab),
           so the mapping was built and never used.

         Confirm the tab you meant says `header` or `column <letter>`. Every
         other value leaves that tab exactly as it was.
       - `unnamed_columns` — which sheet and column had no header, with sample
         values. That is the column the letter belongs on.

       Then re-read the warning itself: the names from the tab you mapped should
       be gone. Names still listed from **other** tabs are those tabs' own copy of
       the problem, not a sign this mapping failed. Check whether they have an
       `unnamed_columns` entry of their own.

       **One field gets one column per tab, so two keys for the same field only
       work when they land on different tabs.** `--map "B=up_ga4_name,C=up_ga4_name"`
       is right when the unnamed column is B on one tab and C on another *and*
       each letter is an ordinary named column on the other tab — measured on
       such a workbook, both tabs mapped and all four user properties kept their
       GA4 names. Where **both** letters are reachable on one tab (two unnamed
       columns — say a name column and a notes column), the first key in the
       `--map` string wins and the second is refused: measured on one such tab,
       `"B=…,C=…"` stored column B and `"C=…,B=…"` stored column C. So before
       passing two keys, read `unnamed_columns`. If both candidates sit on the
       **same** tab, pass only the letter whose `sample_values` are GA4 names —
       the other one cannot be mapped in the same run, and it is usually not
       wanted anyway. If a tab has no GA4 name column at all, no mapping can
       invent one; that sheet has to gain the column, which is the moment to say
       so to the user.

       **`--sheet` does not narrow any of this.** It only chooses which tab is
       read as the event sheet; user properties are still collected from every
       tab and a `--map` key still applies to every tab. A user-property tab is
       not a valid `--sheet` target either — it comes back `needs_mapping`,
       because it has no event columns.

       **Re-parsing without `--map` does not undo a mapping.** A successful parse
       stores it in `taxonomy.json` and the next run reuses it (the response says
       `reused_column_map`). To change it, pass the corrected `--map` — an
       explicit one always replaces the stored one. To undo the parse itself,
       roll the taxonomy back:

       ```bash
       python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_restore.py            # list generations
       python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_restore.py -g latest  # roll back
       ```

       That restores `taxonomy.json` and `taxonomy.md` together, and the restored
       file carries the mapping that was in force at that generation — so the
       next flag-less re-parse behaves as it did then. Use the `user_property_count`
       in the listing to pick the generation with the user.

       **Never carry on to the comparison step while this warning stands** — with
       labels stored as names, every one of them comes back "not registered",
       which reads as a broken implementation. Measured on a real taxonomy: 24
       user properties, all correctly registered, all reported as missing.
       `taxonomy_diff.py` checks this independently and reports `invalid_names`,
       so a later session that starts at the comparison step is not left without
       the warning — but do not rely on that to skip fixing the parse.
   - **If `case_only_duplicate_events` is present, ask the user before moving
     on.** Two event names differing only by case (e.g. `Purchase` vs `purchase`) were kept as
     separate events, and their parameters were split between them. GA4 sends one exact name,
     so this is nearly always a typo in the sheet. Don't pick a casing yourself — ask which one
     is actually being collected (`ga4_events.py list` shows what GA4 really has), have the
     sheet corrected, and re-parse. If it's left as is, the unused casing will later show up in
     the comparison step as "defined but not collected" and look like a broken implementation.
   - Even when a single sheet mixes events, common parameters, and user properties, rows
     are read separately. A vertically merged cell (blank) has its category filled in from
     the previous value.
     If both an `Event` and `Event Name` column are present, the former is treated as the
     label and the latter as the GA4 event name.
   - If the result has common parameters (the `common_parameters` array in
     `.ga4/taxonomy.json`, or a filled-in `## Common Parameters` section in `taxonomy.md`),
     confirm with the user whether that block sat **above the event list** in the original
     sheet — if it was in the middle, it may have been silently absorbed into the previous
     event without any notice.
   - If `needs_sheet_choice:true`, several tabs look like an event taxonomy (e.g. a Pixel
     comparison tab). Show the user `candidates`, **ask which tab is the event taxonomy**,
     then re-run with `--sheet "<tab name>"`. Don't pick a tab on your own.
   - If `needs_mapping:true`, automatic column recognition failed. Look at `sheets[].headers`
     in the response and map each column to a canonical field (category, event_label,
     ga4_name, event_description, param_name, param_type, param_description, param_example,
     param_scope), then re-run with `--map "original-header=canonical-field,..."`.
   - If `needs_mapping:true` **with `unmapped_headers` present**, the event columns were
     recognized but the parameter columns were not, so every parameter would have been
     dropped. Look at `unmapped_headers` and `mapped_fields`, decide which unmapped header
     is the parameter-name column, and re-run with `--map`. Do not treat this as "this
     taxonomy has no parameters" — it means the columns were not recognized.
   - If Google Sheets access fails with a permission/scope error, guide the user to
     **re-login via ga-auth** (granting spreadsheet permission).
3. If connected, continue to the live-data comparison (Scenario D).

## Scenario B: Empty state + GA4 is already collecting data (draft it back)
1. Confirm the connection (guide to ga-auth if missing). Fetch live data:
   ```bash
   .ga4/venv/bin/python {SKILLS_DIR}/ga-taxonomy/scripts/ga4_events.py list --days 30
   ```
2. Draft a CSV from it:
   ```bash
   python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_draft.py
   ```
   Creates `.ga4/taxonomy_draft.csv`, with each event sorted into one of three categories:
   `Auto-collected` (GA4 sends it; nothing to document), `Recommended` (Google defines what
   the name means, so the description is filled in — `purchase`, `add_to_cart`, `refund`
   and the rest of the ecommerce set), and `(Uncategorized)` with blanks for names only this
   business knows. A filled-in `Recommended` description says what the name *should* mean,
   not that the site sends it correctly — that is still the author's to confirm.
3. Have the marketer refine the draft's categories, descriptions, and parameters, then
   parse the finished version as a proper taxonomy via Scenario A.

## Scenario C: Empty state + brand new (no data collected yet)
1. Guide the write-up with `assets/taxonomy_template.{csv,xlsx}` and
   `references/taxonomy-guide.md` (the operational 9-column template is recommended;
   column names/order can differ slightly, since auto-recognition and `--map` can correct
   it).
   Suggest both standard GA4 events (purchase, sign_up, login, etc.) and custom events
   suited to the business.
2. Parse the finished write-up via Scenario A.

## Scenario D: Reconcile against live data (taxonomy + connection both present)
1. Fetch live data (again if the cache is stale):
   ```bash
   .ga4/venv/bin/python {SKILLS_DIR}/ga-taxonomy/scripts/ga4_events.py list --days 30
   ```
2. Fetch the custom definition (custom dimension/metric) status:
   ```bash
   .ga4/venv/bin/python {SKILLS_DIR}/ga-taxonomy/scripts/custom_dims.py fetch
   ```
3. Build the reconciliation report:
   ```bash
   python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_diff.py
   ```
4. Explain the result in human-friendly terms.

   **If `invalid_names` is present, stop and deal with it before reading anything
   else.** These taxonomy names cannot be GA4 identifiers (a GA4 name starts with a
   letter and holds only letters, digits and underscores), so GA4 could never have
   collected or registered them under those names. Every verdict below about them is
   meaningless, not merely negative — reporting them as missing implementations or
   missing registrations is the original incident: 24 correctly registered user
   properties reported as 24 missing, with a recommendation to delete 12 of them.
   This is the same condition the parse-time warning raises, re-checked here because
   nothing about it is recorded in `taxonomy.json` and a session that starts at this
   step never saw the parse. Fix the parse first (Scenario A's invalid-GA4-name
   guidance), then reconcile again.

   **Events**:
   - `defined_not_seen_recently`: **Defined but hasn't come in during the last `days` days.**
     Don't jump to "missing implementation." A narrow lookback window will flag a
     low-frequency event even though it's fine (observed: 9 of 14 flagged events actually
     worked fine, one of them with 474 hits over a 365-day window).
     When telling the user, always state the window ("hasn't come in over the last 30
     days"), and if it looks like an implementation problem, **check a longer window
     first** before concluding: `ga4_events.py list --days 365` -> reconcile again.

   **Check the platform before calling anything a missing implementation.** An
   event that cannot exist on this property's streams will never appear, and
   no lookback window will change that — sending the user to
   `ga4_events.py list --days 365` for one wastes their time and reads as the
   tool being broken.
   - **App-only property** (`platforms` is `["iOS"]`, `["Android"]`, or both,
     and nothing else): `page_view`, `scroll`, `click`, `file_download`,
     `form_start`, `form_submit`, `first_visit`, and `view_search_results` are
     web enhanced-measurement events. They will not arrive.
   - **Web-only property** (`platforms` is exactly `["web"]`): `first_open`,
     `screen_view`, `in_app_purchase`, `app_update`, `app_remove`,
     `app_exception`, `os_update`, the `app_store_*` set, and the
     `notification_*` set are app events. They will not arrive.
   - **Mixed property** (both web and app): both sets are legitimate. Do not
     apply either judgement.
   - **`unknown` in the list, or `[]`, or `null`**: the streams could not be
     classified (or were never looked up), so **apply none of the three**. Say
     the platform is unconfirmed and offer to re-check — a missing `web` here
     is "we could not tell", not "app-only", and turning it into one is the
     confident wrong answer this whole section exists to prevent.
   - `near_misses`: **Look at these first** if present. These are pairs where the taxonomy
     name and the live name differ only in spelling
     (observed case: taxonomy `click_button_cosulting_group` vs. live
     `click_button_consulting_group`).
     Not a missing implementation but a typo/rename, so fix the taxonomy side.
   - `collected_but_undefined`: **Collected but not defined** -> missing documentation or a
     non-standard event. This is the real signal — GA4's automatically collected/enhanced
     measurement events (`page_view`, `session_start`, etc.) have already been filtered out
     into `auto_collected_undocumented`, so everything here is worth documenting.
   - `auto_collected_undocumented`: Collected but not defined, and also one of GA4's
     automatically collected/enhanced measurement events (see `AUTO_COLLECTED_EVENTS` in
     `taxonomy_schema.py`). Mention the count in passing; don't itemize these to the user or
     tell them to document each one — that's expected, not a gap.
   - `defined_and_collected`: Normal.
   - If `cache_hint` is present, the live-data cache is stale or its age is unknown. Fetch
     again with `ga4_events.py list` before reporting the reconciliation result.

   **Parameters / user properties** (`parameters`/`user_properties` sections, each with an
   `items` array classifying every parameter):
   - `defined_not_registered`: **The most important output.** Present in the taxonomy but
     not registered as a custom dimension/metric, so it **cannot be queried in analysis.**
     Guide the user to register it in GA4 Admin -> Custom Definitions. Until registered,
     this parameter can't be broken out or filtered on.
   - **Check `scope` before giving registration advice.** A parameter with `scope: "item"`
     must be registered with the scope set to **Item** in GA4 Admin, not Event. Telling a
     marketer to register an item-scoped parameter as event-scoped produces a custom
     dimension that cannot break out per-product data.
   - `standard_metric` (with `note`): queryable without registration, but the value is an
     aggregate over the items array (`itemRevenue`, `itemsPurchased`), not the raw
     per-item figure. Say so — don't present it as an exact match for the parameter.
   - `ambiguous: true`: the taxonomy did not state the scope and the parameter is not
     registered, so it was treated as event scope. Relay the accompanying `hint`: ask the
     user to add an `items.` prefix or a scope column. **Do not request registration until
     the scope is confirmed.**
   - `standard_equivalent`: Queryable via a standard dimension (the `standard_dimension`
     field), so **no registration is needed** — don't tell the user to register it.
     The correspondence table only includes parameters where GA4 **takes that parameter
     as input** to populate the standard dimension (automatic collection/enhanced
     measurement). Items like `source`/`medium`/`campaign`, which merely share a name but
     come from a different source, are deliberately excluded — see the comments in
     `param_naming.py`.
   - `reserved_not_registerable`: GA4 **refuses** this name as a custom definition, so this
     is *not* a registration request to make — it can never be queried through the Data API
     under this name. Do not route it to the `defined_not_registered` advice above; telling
     the marketer to register it sends them to an Admin screen that will reject the name,
     which is the exact wrong answer this classification exists to prevent. Say the name is
     reserved and, where the `note` names a standard equivalent, point at that instead.
     Reserved names are common in real taxonomies (`user_id`, `session_id`, anything with a
     `google_`/`ga_`/`firebase_` prefix), so expect to hit this.
   - `defined_and_registered`: Normal. `api_names` (an array — a metric can have more than
     one aggregation variant) holds the actual queryable names. If a `note` says a standard
     equivalent exists, prefer that name — it needs no registration and stays queryable if
     the custom definition is ever removed.
   - `registered_not_defined`: A separate top-level list under the section
     (`parameters`/`user_properties`) — registered but absent from the taxonomy -> a
     candidate to add to the taxonomy.
     Not an `api_name` string but an array of objects shaped like `items`
     (`parameter`/`scope`/`kind`/`api_names`/`unit`), and **grouped by parameter name**. Even
     if a metric has all 3 aggregation variants (sum/average/count) registered, it still
     appears as a single entry, with all 3 queryable names bundled into `api_names` — only
     one line needs to be added to the taxonomy.

   `available: false` means step 2 hasn't been run yet. This isn't an error, so just note it
   and still deliver the event reconciliation result.

   **Whether an unregistered parameter is actually being collected is unknowable.** GA4 only
   exposes registered custom definitions via the API, so say only "not registered" and don't
   guess at collection status.

## File Locations
- Runtime state: project-local `.ga4/` (gitignored)
  - `taxonomy.json`: the parsed taxonomy (plan) — events (label/ga4_name/parameters[type])
    + common_parameters (common parameters not belonging to a specific event) +
    user_properties. Each user property has `name` (the GA4 name) and `label` (the
    human-readable name, `null` when the sheet never separated the two).
  - `taxonomy.md`: a human-readable taxonomy summary. Its parameter table has a **query
    name** column (`method (standard)` / `customEvent:author` / `customEvent:stay_time
    (metric)` / `Not registered — cannot query`) so ga-use doesn't query with the wrong
    name. Two labels carry advice rather than a name, and they mean different things:
    `Reserved name — cannot be registered or queried` means GA4 will reject the name, so
    **do not** send the marketer to Admin -> Custom Definitions; `customEvent:x — prefer
    standard Y` means the parameter is registered but a standard dimension already answers
    it, so quote Y (no registration to maintain, and it survives the custom definition
    being removed).
    Shows `(Needs confirmation)` if `custom_definitions.json` is missing — fetching it with
    `custom_dims.py fetch` alone does not update an already-generated `taxonomy.md` (only
    `parse_taxonomy.py` regenerates its contents; `taxonomy_restore.py` merely restores an
    earlier copy). Fetch it, then **re-parse the taxonomy** (Scenario A step 2) to fill it in.
  - `taxonomy_backups/<timestamp>/`: a copy of `taxonomy.json`+`taxonomy.md` from just
    before parsing (last 5 generations). Rolls back the whole folder if parsing the wrong
    file/sheet wiped out the taxonomy.
  - `collected_events.json`: the live-data cache (produced by `ga4_events.py`)
  - `taxonomy_draft.csv`: the drafted-back draft (for the marketer to review)
  - `custom_definitions.json`: custom dimension/metric registration status (produced by
    `custom_dims.py`)
- `config.json` (`property_id`) and `token.json` are created and owned by **the ga-auth
  skill**.
- The `GA4_DIR` environment variable can change the `.ga4` location (default:
  `<cwd>/.ga4`).
