# Event Taxonomy Write-up & Upload Guide

`{SKILLS_DIR}` = the directory these ga skills are installed in (the parent of this skill's
directory; `.claude/skills` in a Claude Code project). Substitute the actual path.

## 1. Format
The taxonomy can be provided as a **Google Sheets URL**, **Excel (xlsx)**, or **CSV
(UTF-8)**. The operational template (`assets/taxonomy_template.xlsx`) has two sheets.

**Event sheet (recommended 9 columns):**
| Column | Meaning |
|---|---|
| Category | Event grouping |
| Event Label | Business-facing name (e.g. Button Click) |
| GA4 Event Name | The actual collection key (e.g. button_click) — the basis for live-data reconciliation |
| Description | When the event fires |
| Parameter Name | The parameter (e.g. button_name) |
| Parameter Type | string/int/etc. |
| Parameter Description | What the parameter means |
| Example Value | A sample value |
| Parameter Scope | `item` / `event` / `user` (optional — see "Item-scoped parameters" below) |

**User property sheet (optional, 5 columns):** User Property Name / API Name / Type /
Description / Example Value. `API Name` is the name GA4 actually receives; the section
below explains why it is a column of its own.

### User properties: splitting the label from the GA4 name

When the human-readable name and the name sent to GA4 differ, put them in **two
separate columns**.

| User Property Name | API Name (or `ga4속성명`) | Type | Description | Example Value |
|---|---|---|---|---|
| User Grade | `user_grade` | string | Membership tier | gold |

Either header is auto-recognized — `API Name` and `ga4속성명` (also `속성api명`) are both
in the alias list, so a Korean-speaking author does not need to write English.

**The GA4 name column must have a header too.** A blank-header column is invisible to
the parser, so a Korean/English label ends up stored in the GA4 name slot. Stored that
way, the comparison step later reports every user property as "not registered", even
when registration is actually fine.

A sheet that was already built without that header can still be parsed without fixing
it — Claude addresses the column by its spreadsheet letter, e.g. `--map "B=up_ga4_name"`.
On a multi-tab workbook that letter applies to every tab, not just the one the column was
seen in. It is refused on any tab where that column's own header already names something
(a `Type` column stays a type column), and the response's `map_resolution` reports, per
tab, how the key was read — Claude checks that rather than assuming the mapping landed
where it was aimed.

A tab has only **one** GA4 name column. Several letters can be given at once when the
column sits at a different letter on each tab (`--map "B=up_ga4_name,C=up_ga4_name"`),
but where both letters reach a headerless column on the *same* tab only the first
applies and the second is refused — so on a tab with two headerless columns (a name
column and a notes column, say) Claude reads the sample values, decides which one is the
GA4 name column, and passes that letter alone.

## 2. Label flexibility
Recognized even if column names differ slightly (e.g. "Event Name" vs. "Event Label") or
the type column is missing.
If auto-recognition is ambiguous, the skill checks the column mapping with you and
reprocesses.

## 3. Write-up rules
- If an event has multiple parameters, add one row per parameter.
- An additional parameter row is attached to the previous event if its name columns
  (Event Label, GA4 Event Name) are left blank.
- Save CSV as UTF-8. CSV is a single sheet, so provide user properties via xlsx/Sheets
  instead.

## 4. Upload (parse)
```bash
# Google Sheets URL (the sheet must be shared with the logged-in account)
.ga4/venv/bin/python {SKILLS_DIR}/ga-taxonomy/scripts/parse_taxonomy.py "https://docs.google.com/spreadsheets/d/<ID>/edit"
# Local file (csv = system python3, xlsx = venv)
.ga4/venv/bin/python {SKILLS_DIR}/ga-taxonomy/scripts/parse_taxonomy.py <file-path>
```
On success, creates `.ga4/taxonomy.json`/`taxonomy.md`. If Google Sheets access fails with
a permission error, re-login via ga-auth (granting spreadsheet permission).

## 5. Reconcile against live data / draft one back
```bash
.ga4/venv/bin/python {SKILLS_DIR}/ga-taxonomy/scripts/ga4_events.py list --days 30
python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_diff.py     # taxonomy (GA4 event name) <-> live data
python3 {SKILLS_DIR}/ga-taxonomy/scripts/taxonomy_draft.py    # live data -> draft CSV (9 columns)
```

## Item-scoped parameters (ecommerce)

Parameters sent inside the ecommerce `items` array are **item-scoped**, and GA4 treats
them differently from event parameters that merely share a name. Make the distinction
explicit in your sheet, either way:

- **Prefix the name**: `items.item_name`, `items.price`, `items.sku`
  (`items[].item_name` and `items[0].item_name` work too)
- **Or fill the `Parameter Scope` column**: `item` / `event` / `user`

If both are present, the prefix wins.

Leaving both blank is allowed — the scope is then resolved from what is actually
registered in GA4. But when nothing is registered either, the parameter is reported as
ambiguous and no registration advice can be given, so stating the scope is worth the
extra column.

Many item fields need no registration at all: `items.item_id`, `items.item_name`,
`items.item_category`, `items.item_brand`, `items.item_list_name`, and `items.index` are
queryable as standard item dimensions.
