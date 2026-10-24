# @frontendchecklist/cli

Standalone CLI to audit a URL against Front-End Checklist rules (single-page).

## Usage (from repo root)

```bash
# Audit a URL (default: console output)
pnpm audit:url https://example.com

# Or with explicit "audit" command
pnpm exec frontendchecklist audit https://example.com

# Output formats
pnpm audit:url https://example.com --format json
pnpm audit:url https://example.com -f md
pnpm audit:url https://example.com -f html   # basic HTML report

# Focus categories and minimum priority
pnpm audit:url https://example.com --categories accessibility,seo --min-priority high
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--format` | `-f` | Output: `console` \| `json` \| `md` \| `html` | `console` |
| `--categories` | — | Comma-separated: html, css, javascript, performance, accessibility, seo, security, images, testing, general | all |
| `--min-priority` | — | Minimum priority: critical \| high \| medium \| low | medium |

## Requirements

- The public rules package must be available. Inside this monorepo, the CLI falls back to the
  local content source automatically.
- Node 18+.

## Publish

For npm publish, add a build step that compiles `src/index.ts` to `dist/index.js` and set `bin` to `./dist/index.js`. Currently the CLI is intended for local use via `pnpm audit:url`.
