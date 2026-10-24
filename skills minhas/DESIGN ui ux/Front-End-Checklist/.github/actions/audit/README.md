# Frontend Checklist Audit Action

Run a single-page frontend audit in GitHub Actions using the [Frontend Checklist](https://frontendchecklist.io) MCP API.

## Usage

In your repository, add a workflow that uses this action (when using the action from this repo):

```yaml
name: Frontend Audit

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Option A: Use the action from the frontendchecklist.io repo
      - uses: thedaviddias/front-end-checklist/.github/actions/audit@main
        with:
          url: 'https://your-app.vercel.app'
          fail-on-critical: '1'   # fail if 1+ critical issues
          fail-on-high: '5'       # fail if 5+ high issues
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `url` | Yes | — | Full URL to audit (must be `https`) |
| `fail-on-critical` | No | `0` | Fail the job if critical issues ≥ this (0 = do not fail) |
| `fail-on-high` | No | `0` | Fail the job if high issues ≥ this (0 = do not fail) |
| `mcp-endpoint` | No | `https://mcp.frontendchecklist.io` | MCP API base URL |

## Outputs

| Output | Description |
|--------|-------------|
| `issues-found` | Total issues found |
| `critical-count` | Number of critical issues |
| `high-count` | Number of high issues |

## Requirements

- `curl` and `jq` (available on `ubuntu-latest`).
- The URL must be publicly reachable (no localhost).

## Publishing to the Marketplace

To publish this action for `uses: frontendchecklist/audit-action@v1`, create a separate repository (e.g. `frontendchecklist/audit-action`) and copy this action there, or configure this repo as the source in the GitHub Action marketplace.
