---
name: ga4
description: Use when the user mentions Google Analytics / GA4 but the request is vague ("take a look at our GA", "how's our data?", "GA 좀 봐줘", "우리 데이터 어때?"), is getting started ("where do I start?", "뭐부터 해야 해?", right after installing), asks what these skills can do, or makes a multi-step request spanning connection, event taxonomy, and analysis (e.g. "parse our taxonomy sheet and analyze last month", "정의서 올리고 지난달 분석해줘"). Diagnoses the .ga4/ journey state and routes to the ga-auth, ga-taxonomy, or ga-use skill in the right order. Clear single-purpose requests (a specific analysis, parsing a taxonomy file, logging in) are handled directly by those skills — do not use this one.
---

# GA4 Guidance & Routing Skill (ga4)

Takes in vague or multi-step GA4 requests, diagnoses the current state, and guides/routes to the
right skill (ga-auth → ga-taxonomy → ga-use) in order. This skill does not perform analysis or
authentication itself.

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
The audience is **non-technical marketers**:
- Break work into small steps, and explain "what/why" in one line at every step.
- Show the full journey picture **briefly, once**. Don't paste a long guide all at once.
- Don't ask the marketer for JSON or commands. The skill handles file placement and command execution.

## Step 1: Status Check (always first)
`{SKILLS_DIR}` = the directory these ga skills are installed in — the parent of this skill's
directory (`.claude/skills` in a Claude Code project). Substitute the actual path.
```bash
python3 {SKILLS_DIR}/ga4/scripts/ga_journey.py
```
**Always run the command from the project root** — both the script path and the default `.ga4`
location assume this, so running it from a subdirectory silently produces an all-false diagnosis
that sends an already-connected user back into onboarding.
Run it with the system `python3` (stdlib only — it must work even without a venv). Output JSON:

| Field | Meaning |
|---|---|
| `ga4_dir` / `ga4_dir_present` | the folder actually searched, and whether it exists. **Check this first.** `.ga4` is resolved against the current working directory, so running from the wrong folder makes every field below `false` at once — which reads as "nothing is set up" and routes an already-connected user back into onboarding. When it's `false` the output carries a `hint`; confirm the working directory (or `GA4_DIR`) and re-run before routing anyone anywhere |
| `oauth_client_present` | `.ga4/oauth_client.json` exists (the OAuth client the administrator created) |
| `token_present` | login complete (token.json + refresh_token) |
| `property_configured` / `property_id` | GA4 property selection complete |
| `taxonomy_present` | `.ga4/taxonomy.md` exists — the file's presence only, not whether it has anything in it |
| `taxonomy_event_count` | how many events that taxonomy actually holds. **`0` means the file exists but is empty**, which happens when an unfilled template was parsed — treat that as "no taxonomy yet" and route to ga-taxonomy, not to analysis. `null` means the count couldn't be read (missing/unreadable taxonomy.json), so don't conclude anything from it |
| `platforms` / `platforms_checked_at` / `platforms_age_days` | which platforms this property collects from (`web`/`iOS`/`Android`/`unknown`), when that was last checked, and how many days old the check is. See **Platform Context** below — `null` is not "no platforms," it's "never looked up" |
| `venv_present` | `.ga4/venv` is ready (needed for API calls) |
| `deps_ready` | all libraries used by the three skills are installed. `false` means not installed (**including when the venv itself doesn't exist**); `null` means **the check failed** (installed status unknown — don't assume they're missing) |
| `missing_packages` | (only when present) `{"skill-name": ["module-name", ...]}` — only what's missing |
| `deps_fix` | (only when present) commands you can run as-is (newline-separated). If there's no venv, the **first line creates the venv** |

**If a dependency is missing, resolve it yourself before delegating**: if `deps_ready` is `false`, **run the `deps_fix` commands yourself** (one line: "I'll install the libraries needed for the analysis"), re-check that it passes, then delegate. Don't ask the marketer to run pip commands. If `venv_present` is false, the first `deps_fix` line creates the venv, so **run that too** — skipping this step and delegating anyway means the delegated skill tries to run `.ga4/venv/bin/python`, hits a shell error (`no such file or directory`), and the marketer sees a raw error instead of JSON. If it's still `false` after re-checking, **don't repeat the same command** — just tell the user directly what failed. If `deps_ready` is `null`, the install status couldn't be confirmed, so proceed anyway and walk through setup only if an actual error occurs.

If the output is `"ok": false`, follow the accompanying `hint` and explain it in the user's language to guide the user's next action.

**Connection check**: "connected" requires both `token_present` and `property_configured` to be true. If not connected, respond to any request with one line — "GA4 needs to be connected first (1-minute check → log in → select a property)" — and delegate to ga-auth. However, if login hasn't happened yet (`token_present=false` — the Step 5 condition), show **the Step 5 journey overview first**, before delegating.

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

## Step 2: Intent Classification
Classify the request using the table below and delegate. **A clear single-purpose request belongs
to that skill from the start**, so even if this skill caught it, hand off to that skill immediately
(without further explanation).

| Intent | Example phrasing | Delegate to |
|---|---|---|
| Connection, login, permission issues | "connect GA", "login isn't working", "permission error", "GA 연결", "로그인이 안 돼", "권한 오류" | **ga-auth** |
| Parsing/reconciling/drafting a taxonomy | "register our taxonomy", "are we collecting what we designed?", "we don't have a taxonomy, make one", "정의서 등록", "설계대로 수집되고 있어?", "정의서가 없는데 만들어줘" | **ga-taxonomy** |
| Data lookup/analysis | "last week's page views", "top 10 events", "conversion funnel", "지난주 페이지뷰", "이벤트 상위 10개", "전환 퍼널" | **ga-use** |
| Capability questions | "what can GA do?", "how do I use this?", "GA로 뭘 할 수 있어?", "이거 어떻게 써?" | Go to Step 3 (but lead the answer with the 3-step journey overview) |
| Vague | "take a look at our GA", "how's our data?", "GA 좀 봐줘", "우리 데이터 어때?" | Go to Step 3 |
| Compound (spans 2+ skills) | "parse our taxonomy sheet and analyze last month", "정의서 올리고 지난달 분석해줘" | Go to Step 4 |

**How to delegate**: find the matching name (`ga-auth`/`ga-taxonomy`/`ga-use`; may appear as
`<plugin>:ga-auth` for a plugin distribution) in the list of available skills and invoke it with
the Skill tool.

When handing off to ga-taxonomy or ga-use, state the property's platforms in the
handoff. Both skills reason differently for a web-only, an app-only, and a mixed
property, and the diagnosis already has the answer.

## Step 3: Vague Request → State-Based Suggestions
Based on the diagnosis, propose **2-3 next-step options** and delegate to the matching skill once
the user picks one:

- Not connected → propose only "① Start by connecting GA4 (5-10 min)" and delegate to ga-auth.
- Connected + no taxonomy → "① Skim last week's data ② Register the event taxonomy (if you have one) ③ Draft a taxonomy from live data (if you don't)"
- Connected + has a taxonomy → "① Analyze a metric you're curious about ② Reconcile the taxonomy against what's actually being collected"

## Step 4: Compound Request → Break Down, Then Delegate in Sequence
1. First show a list breaking the request into per-skill steps: "Here's the order I'll follow: ① Parse the taxonomy (ga-taxonomy) → ② Analyze last month (ga-use)".
2. If a prerequisite is missing, insert it at the front (⓪ ga-auth if not connected).
3. After the user agrees, invoke the Skill tool **one step at a time**, confirm each step finished,
   then move to the next. If a middle step fails, **stop there** and report what failed — stacking
   the next step on top of a failed result buries the cause, leaving the marketer unable to tell
   which step was the problem.

## Step 5: Onboarding (first-time use)
If the user hasn't logged in yet (`token_present=false`), they're a first-time user. **This holds
even if `oauth_client.json` already exists** — an administrator handing over the file in advance is
the standard entry path, and excluding that case would leave an obvious first-time user without the
journey overview. Show the 3-step journey **once, briefly**, and start with ga-auth:

> Using GA4 with Claude is a 3-step journey:
> **① Connect** (ga-auth: log in, select a property, 5-10 min) → **② Taxonomy** (ga-taxonomy: register/reconcile the event taxonomy, optional) → **③ Analyze** (ga-use: ask in natural language, get a table back)
> Let's start with ① now.

Step ② is optional — analysis works without a taxonomy, so if the user prefers, skip straight from ① to ③.
