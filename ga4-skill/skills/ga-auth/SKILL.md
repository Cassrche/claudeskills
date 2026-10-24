---
name: ga-auth
description: Use when the user wants to connect a GA4 (Google Analytics 4) property, set up GA4 authentication/login, or fix GA4 access. Marketer-friendly OAuth login (no gcloud) via a client-provided desktop OAuth client, then property selection. Produces .ga4/token.json and .ga4/config.json for the ga-use skill.
---

# GA4 Authentication & Connection Skill (ga-auth)

Lets a marketer connect to GA4 without gcloud, through "log in → allow → select a property."
The marketer receives a desktop OAuth client (`.ga4/oauth_client.json`) that the organization's
administrator created, and uses it to log in.
Deterministic work is done by the Python scripts in `scripts/`; you decide which step applies.

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
The audience is **non-technical marketers**. Most have never touched GCP or OAuth concepts, so follow these rules:
- **Break work into small steps.** Don't paste a long guide all at once — walk through one or two steps, confirm it worked, then move on.
- **Explain "what/why" in one line at every step.** Name the exact button to click.
- **Call out the 3 most common traps in advance:** ① forgetting to register a test user, ② the "unverified app" warning (this is normal), ③ when switching accounts, the new account must also be a registered test user.
- **Do the heavy lifting for the user.** Handle file placement and command execution yourself whenever possible — the user should only need to click through the console and log in via the browser.

## Interpreter Rules
- `ga4_status.py`, `ga4_auth.py`: can run with the system `python3` (stdlib only)
- `ga4_login.py`, `ga4_admin.py`: **must run with `.ga4/venv/bin/python`** (requires the GA4 and oauthlib libraries)
- `{SKILLS_DIR}` = the directory these ga skills are installed in — the parent of this skill's
  directory (`.claude/skills` in a Claude Code project; other agents use their own location).
  Substitute the actual path. Run commands from the project root.

## Step 1: Status Check (always first)
```bash
python3 {SKILLS_DIR}/ga-auth/scripts/ga4_status.py
```
**First check `ga4_dir_present`.** If it is `false`, every flag below is also `false`, and that
combination does *not* mean the setup is broken — `.ga4` is resolved against the current working
directory, so it also happens when the command runs from the wrong folder. The output carries a
`hint` naming the exact path that was searched. Confirm you are in the marketer's project directory
(or set `GA4_DIR`) and re-run **before** entering Step 2: sending an already-connected user back
through the OAuth setup costs them a long, painful detour aimed at the wrong problem.

Once `ga4_dir_present` is `true`, use the output JSON to decide which step to enter:

| oauth_client_present | token_present | property_configured | → Step |
|---|---|---|---|
| false | - | - | **Obtain the OAuth Client** (2) |
| true | false | - | **Log In** (3) |
| true | true | false | **Select a Property** (4) |
| true | true | true | **Connected** (5) |

`token_present` is a lightweight check (token.json exists and contains a refresh_token). Actual validity is confirmed on the first API call.

**Dependency check**: also look at `venv_present`/`deps_ready` in the same output. If `venv_present` is false, create the venv and install the three requirements files per `references/setup-guide.md` section 1. If `deps_ready` is `false`, **run the `deps_fix` pip command yourself** (explain in one line: "I'll install the required libraries") and re-check — don't ask the marketer to run pip. If `deps_ready` is `null`, the check itself failed; don't assume the deps are missing, just proceed.

## Step 2: Obtain the OAuth Client (if missing)
First show the **big picture** briefly — two roles, 3 steps for the marketer:
```
[Administrator] Create the OAuth client once in GCP -> hand over oauth_client.json
      └─▶ [Marketer] 1. place the file -> 2. log in and allow in the browser -> 3. select a property
```
Then check the user's starting point:
- **If `oauth_client.json` already exists** (from earlier work or the administrator), just get the file path, have this skill copy it to `.ga4/oauth_client.json`, and go to Step 3. Even in this path, verify the top-level key is `installed` — if it's `web`, it's not a desktop app and login will fail (`ga4_login.py` blocks before the call and explains what's needed).
- **If it needs to be created**, walk through `references/admin-setup-guide.md` **in small steps**. Order: GCP project → enable 2 APIs → consent screen → create the desktop OAuth client → download the JSON.
  - The consent screen path **depends on account type.** First ask "is this a company Workspace account or a personal @gmail?" and branch: Workspace gets **Internal** (easiest), personal gmail gets **External + add your own email as a test user** (⚠️ skipping this registration blocks login).
- Once the download finishes, **get the file path and have this skill place it**:
  ```bash
  mkdir -p .ga4 && cp "<download-path>" .ga4/oauth_client.json
  ```
  After placing it, verify the structure (top-level key `installed`, redirect_uris containing `http://localhost` means it's a valid desktop app).
- If there's no venv, walk through venv creation and install per `references/setup-guide.md` section 1.

## Step 3: Log In (marketer, no gcloud needed)
**Before running it**, explain what will happen in the browser:
1. A browser tab opens automatically → **select the account with GA4 access**
2. (For a personal gmail/unverified app) **the "unverified app" warning is normal** → **Advanced → Continue/Go to...**
3. The "View your Google Analytics data" permission prompt → **Allow**
4. When "The authentication flow has completed..." appears, it succeeded → close the window

Then run it (this blocks until the browser flow completes, so use a generous timeout):
```bash
.ga4/venv/bin/python {SKILLS_DIR}/ga-auth/scripts/ga4_login.py
```
`ok:true` means `.ga4/token.json` was created. `ok:false` means you should explain the error's hint in the user's language (Internal setting, test user, bypassing the warning) and retry.

> **Note for remote/SSH·headless environments:** loopback login requires the browser and the script to run on the same machine. If remote, have the user log in on their own PC and copy the resulting `token.json` to the server (`references/setup-guide.md`).

## Step 4: Select a Property
1. Fetch the property list:
   ```bash
   .ga4/venv/bin/python {SKILLS_DIR}/ga-auth/scripts/ga4_admin.py list-properties
   ```
2. Present it grouped by account for readability, and have the user pick which property to use. If there are many, summarize counts per account and have them pick a representative property.
3. **If the list is empty (`[]`)** — authentication succeeded, but this account has no accessible GA4 properties. The most common cause is **logging in with the wrong account**. Confirm the account has GA4 access, and if needed, **log in again** with the correct account (see the re-login note below).
4. Look up the property's currency, timezone and data streams — the listing above doesn't carry them:
   ```bash
   .ga4/venv/bin/python {SKILLS_DIR}/ga-auth/scripts/ga4_admin.py get-property <PROPERTY_ID>
   ```
   The same call reports `data_streams` and `platforms` — whether this property
   collects from the web, an iOS app, an Android app, or several at once. **Tell
   the marketer what it found in one line** ("this property has a website and an
   iOS app"), because it is the first thing they can confirm or correct, and
   because every later skill reasons from it.

   If `platforms` is `[]`, the property has no data streams at all and is
   collecting nothing — say so plainly rather than moving on. If the keys are
   absent, the lookup failed; that is not fatal, so continue without them.
5. Save the selection, passing every value from step 4 through:
   ```bash
   python3 {SKILLS_DIR}/ga-auth/scripts/ga4_auth.py save-property <PROPERTY_ID> \
     --name "<NAME>" --account "<ACCOUNT>" --currency "<CURRENCY_CODE>" --time-zone "<TIME_ZONE>" \
     --retention-months "<EVENT_DATA_RETENTION_MONTHS>" --platforms "<PLATFORMS>"
   ```
   **Don't skip the lookup.** Neither value can be inferred, and both change what an answer means:
   a property measured during development runs on `Asia/Seoul` time while reporting revenue in
   `USD`, so reading its revenue as won is out by roughly 1300x. Report responses carry these too,
   but only for the runReport family — a realtime response has no metadata at all, so without this
   the currency is unknowable there. If step 4 fails, still save the rest; the fields are stored as
   `null`, which reads as "not known" rather than "no currency".
   **Leave out any flag whose value step 4 did not report.** `get-property` omits a key it could
   not read, and passing an empty string instead is not the same thing — the script normalises it,
   but the flag you drop is the one that reads correctly as "not known".
   `--retention-months` matters for funnels only, and matters a lot: beyond the property's data
   retention `runFunnelReport` returns **zero rows with no error** while `runReport` over the same
   period answers normally. Without this value ga-use cannot tell that empty funnel apart from
   "nobody converted" — it says so explicitly rather than staying silent, so the marketer learns
   the check did not run instead of hearing a confident zero.
   `--platforms` takes the `platforms` array from step 4 as a comma-separated
   list in **GA4's own spelling** — `web`, `iOS`, `Android`. Do not lowercase
   them: these are the values GA4's `platform` dimension returns, so a filter
   built from `ios` matches nothing and reports no error. (The script now
   corrects casing as a backstop, but write the right spelling anyway — the
   backstop only knows the four values GA4 uses today.) If step 4 said the
   property has no streams, pass `none`; if the lookup failed, leave the flag
   out, which stores "not known" rather than a guess. If the array contains
   `unknown`, **pass it through as-is** alongside the others — it means a stream
   could not be classified, and dropping it would turn "we could not tell" into
   a confident platform answer downstream.
   **This command rewrites `config.json` from scratch**, so treat steps 4 and 5
   as a pair: any flag you omit is stored as `null`, even if the previous save
   had a value for it. Re-running step 5 alone to refresh the platform list
   would wipe the currency, timezone and retention with it.

### Re-login to switch accounts
To log in again with a different account, re-run `ga4_login.py` (it uses `prompt=consent`, so the account picker appears cleanly).
However, **if using a personal gmail (External test mode), the new account must also already be registered as a test user** on the OAuth consent screen. If not, login fails with "Access blocked: app is in testing mode" — have the user register it first, then log in again.

## Step 5: Connected
Let the user know the connection is complete, and point them to the **`ga-use`** skill for analysis and the **`ga-taxonomy`** skill for the event taxonomy.
If the user explicitly asks to reconfigure (re-login/change property), redo that step regardless of the table above.

## File Locations
- Runtime state: project-local `.ga4/` (`oauth_client.json`, `token.json`, `config.json`, `venv/`)
- `oauth_client.json`: the desktop OAuth client created by the administrator (`references/admin-setup-guide.md`).
- `token.json`: credentials produced by login (auto-refreshed).
- The `GA4_DIR` environment variable can change the `.ga4` location (default: `<cwd>/.ga4`).
