# GA4 Skills (`ga4-skill`)

**English** · [한국어](./README.ko.md)

[![skills.sh](https://skills.sh/b/ogaeng/ga4-skill)](https://skills.sh/ogaeng/ga4-skill)

**Four agent skills that let marketers — not developers — connect to Google Analytics 4,
manage an event taxonomy, and analyze data by just asking.**

No gcloud, no SQL, no JSON. The user logs in through a browser and asks questions in
plain language; the skills handle file placement, command execution, and query building.

## What it looks like in practice

| You say | What happens |
|---|---|
| "Connect Google Analytics" | Browser login → list of properties you can access → your choice is saved (5–10 min, once) |
| "Page views for last week?" | Data API query → answer as a clean table |
| "What do people do before converting?" | Funnel + path + importance analyses combined into one report |
| "Is this being collected the way we specified?" | Parses your taxonomy sheet → compares against live data → lists missing and undocumented events |
| "How many people are on the site right now?" | Realtime report (last 30 minutes) |
| "Take a look at our GA" (vague) | Diagnoses your current state and offers the 2–3 sensible next steps |

## How the four skills fit together

```
        ┌──────────────────────────────────────────────┐
        │  ga4  (router)                               │
        │  vague / multi-step / first-time requests    │
        │  → diagnoses state, delegates in order       │
        └───────────────────┬──────────────────────────┘
                            │
   ┌────────────┐    ┌──────────────┐    ┌────────────┐
   │  ga-auth   │───▶│ ga-taxonomy  │───▶│   ga-use   │
   │  connect   │    │  taxonomy    │    │  analyze   │
   │            │    │  (optional)  │    │            │
   └────────────┘    └──────────────┘    └────────────┘
        │                   │                   │
   token.json          taxonomy.md          your answers
   config.json         (event dictionary)
        └────────── connected via the .ga4/ directory ──────────┘
```

The skills never import each other's code. They communicate by leaving files in a
project-local `.ga4/` directory, so each one also works on its own.

### `ga-auth` — connect

Gets you talking to GA4. **Done once.**

- Log in with a desktop OAuth client your administrator created — no gcloud needed
- Properties you can access are grouped by account and offered as a list; your pick is saved
- Tokens refresh automatically on expiry; switching accounts re-triggers login
- Warns you **up front** about the three things marketers most often get stuck on:
  unregistered test users, the "unverified app" screen, and account switching

### `ga-taxonomy` — event taxonomy (optional)

Answers "is this actually being collected the way we designed it?" Analysis works fine
without it.

- **Parse** — reads a Google Sheets URL or a local xlsx/csv into `taxonomy.json` + `taxonomy.md`
- **Column auto-detection** — recognizes headers even when names and order differ from the
  template, via an alias dictionary; ambiguous cases can be corrected with `--map`
- **Reconcile against live data** — separates *defined but not arriving* (implementation gap)
  from *arriving but not defined* (documentation gap), and flags likely typos between them
- **Draft in reverse** — no taxonomy yet? It generates a starter CSV from what GA4 is
  already collecting

### `ga-use` — analyze

Turns natural-language questions into GA4 Data API reports. **The one you'll use daily.**

| Report type | When it's used |
|---|---|
| Basic report | Metric × dimension combinations, top-N, period comparison, filters |
| Realtime | "Who's on the site now", "what just fired" (last 30 min) |
| Pivot | Cross-tabs like "country × device" |
| Cohort | "Do June signups come back week over week" (retention) |
| Funnel | "View → add to cart → purchase", step conversion and drop-off |
| Metadata | Which dimensions and metrics this property actually supports |

Compound questions — conversion analysis, path/journey, performance summaries, diagnosing
a drop, content performance, comparing behavioral importance — follow the planned
multi-query patterns in
[`analysis-recipes.md`](./skills/ga-use/references/analysis-recipes.md).

## Install

```bash
npx skills add ogaeng/ga4-skill
```

Installs into the current project. Useful variations:

| Command | Effect |
|---|---|
| `npx skills add ogaeng/ga4-skill -g` | Install globally (available in every project) |
| `npx skills add ogaeng/ga4-skill -a claude-code` | Install for one agent only |
| `npx skills list` | Show what's installed |
| `npx skills update` | Pull the latest release |
| `npx skills remove ogaeng/ga4-skill` | Uninstall |

Works with Claude Code, Codex, Cursor, Gemini CLI, and the other agents supported by
the [Agent Skills CLI](https://github.com/vercel-labs/skills). Install all four skills —
they're designed as a set.

## Setup

Installing isn't enough on its own: Google requires an OAuth client before anything can
read your analytics. Two roles, each done once.

### Step 1 — Administrator (once per organization)

Someone with edit access to a Google Cloud project creates a **desktop OAuth client** and
hands the downloaded JSON to everyone who'll use the skills. About five minutes, never
repeated: enable two Analytics APIs → configure the consent screen → create a desktop
client → download the JSON.

**Full walkthrough:
[`admin-setup-guide.md`](./skills/ga-auth/references/admin-setup-guide.md)** — including
the test-user step most people miss.

Or just ask your agent: *"Set up the GA4 OAuth client for our org"* — `ga-auth` walks
through it interactively.

### Step 2 — Each user (once)

Put the JSON from Step 1 into your project:

```bash
mkdir -p .ga4
cp ~/Downloads/client_secret_XXXX.json .ga4/oauth_client.json
```

Then tell your agent:

> **"Connect Google Analytics"** / **"GA 연결해줘"**

It builds the Python environment, opens the browser for login, lists the GA4 properties
you can reach, and saves your choice. Then start asking questions.

> A desktop OAuth client's `client_secret` isn't a real secret (desktop apps can't hide
> one), so the same file can go to everyone in the organization.

### Requirements

- **Python 3.10+** — an isolated virtualenv is created at `.ga4/venv` on first use (the agent does this).
- A Google account with at least **Viewer** access to the GA4 property.

## Files it creates

Everything lives in a project-local `.ga4/` directory (override with the `GA4_DIR`
environment variable).

> ⚠️ **Add `.ga4/` to your `.gitignore`** — it holds your auth token.

| File | Created by | Purpose |
|---|---|---|
| `oauth_client.json` | you (Step 2) | The organization's OAuth client |
| `token.json`, `config.json` | ga-auth | Login token and selected property |
| `taxonomy.json`, `taxonomy.md`, … | ga-taxonomy | Parsed event taxonomy |
| `venv/` | shared | Isolated Python environment |

## Troubleshooting

**"Access blocked: app is in testing mode"** — the account you're logging in with wasn't
registered as a test user on the consent screen. The administrator adds it under **OAuth
consent screen → Test users**. (Not needed for Workspace orgs using an Internal screen.)

**"Google hasn't verified this app"** — expected for your own unverified client. Choose
**Advanced → Continue**.

**A script fails with a missing Python module** — ask the agent to run the status check;
it reports exactly what's missing and installs it.

**The agent ignores the skills** — name one directly: *"Use the ga-use skill to…"*.

## Reference

| Document | Contents |
|---|---|
| [`admin-setup-guide.md`](./skills/ga-auth/references/admin-setup-guide.md) | Creating the OAuth client (administrator) |
| [`setup-guide.md`](./skills/ga-auth/references/setup-guide.md) | Python environment and login |
| [`taxonomy-guide.md`](./skills/ga-taxonomy/references/taxonomy-guide.md) | Taxonomy sheet format and columns |
| [`analysis-guide.md`](./skills/ga-use/references/analysis-guide.md) | Full request-spec JSON syntax |
| [`analysis-recipes.md`](./skills/ga-use/references/analysis-recipes.md) | Patterns for compound questions |

## Notes

- Location-independent: skill docs use a `{SKILLS_DIR}` placeholder and scripts resolve
  sibling-skill paths from their own installed location, so the skills work wherever your
  agent installs them (`.claude/skills`, `.agents/skills`, …). Most heavily tested with
  **Claude Code**.
- All API access is **read-only** (`analytics.readonly` + `spreadsheets.readonly`).
  Nothing is ever written back to Google Analytics.
- The agent answers in whatever language you write in, and explains error hints rather
  than pasting them raw.

## License

[MIT](./LICENSE)
