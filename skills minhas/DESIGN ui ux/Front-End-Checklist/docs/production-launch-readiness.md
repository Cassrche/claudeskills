# Production Launch Readiness

Last updated: 2026-05-29

## Executive Summary

The v2 frontend is launchable from the local readiness sweep. The production build, unit CI, typecheck, lint, rule quality gates, source validation, MCP audit, generated skills, and Playwright smoke suite are passing locally.

The main launch blocker is Vercel project configuration. A preview build rehearsal on 2026-05-29 pulled project settings for `david-dias-digital/frontendchecklist.io` and found the project configured as root directory `.` with framework `Other`. Vercel successfully ran the monorepo build, but failed packaging because it expected a static `public` output directory instead of the Next.js app in `apps/web`.

Before production deploy, update the Vercel project settings to:

- Root Directory: `apps/web`
- Framework Preset: `Next.js`
- Build Command: auto-detected, or `pnpm --filter web build`
- Install Command: auto-detected `pnpm install`
- Output Directory: auto-detected

After updating settings, rerun `vercel pull --yes --environment preview --scope david-dias-digital`, `vercel build --yes`, and preview smoke tests.

## Verified Gates

- `pnpm score:rules`: 385/385 rules pass, average score 95%.
- `pnpm validate:rule-structure`: 385 rules checked, 0 errors.
- `pnpm validate:evidence`: 385 rules checked, 0 issues.
- `pnpm validate:sources`: 385 rules checked, 0 broken URLs.
- `pnpm validate:packages`: passes; no `npmPackages` metadata currently present.
- `pnpm generate:skills`: generated 385 skills.
- `pnpm lint`: passes.
- `pnpm typecheck`: 21/21 tasks pass.
- `pnpm test:ci`: 16/16 tasks pass.
- `pnpm exec turbo build --force`: production build passes.
- `pnpm test:e2e:ci`: 9/9 Playwright smoke tests pass across Chromium, Firefox, and WebKit.
- `pnpm mcp:audit`: passes with no critical findings.
- `vercel build --yes`: blocked by Vercel project settings, not app compilation. Vercel ran the Next build successfully, then failed with `No Output Directory named "public" found` because the project is configured as `Other` at repository root.

## Fixed During Sweep

- Restored production build compatibility for `@frontendchecklist/rules` by keeping ESM source imports and adding runtime JS shims for Turbopack resolution.
- Wrapped request-bound account layout auth checks in `Suspense`, fixing the Next.js Cache Components prerender blocker on `/profile`.
- Hardened `pnpm validate:sources` with lower concurrency, longer timeout, HEAD-to-GET fallback, and a retry for transient source-host failures.
- Replaced brittle rule citations with more specific stable sources for breadcrumb, geo meta, meta refresh, Open Graph, RFC URL syntax, and related SEO rules.
- Fixed MCP audit path resolution and switched MCP security-audit invocation to `pnpm dlx`.
- Raised MCP performance budgets to match current corpus size while keeping latency checks active.
- Fixed PR workflow e2e artifact/path filters for the current `apps/web/e2e` layout.
- Removed unnecessary header hydration suppressions and footer decorative blobs.

## Browser QA

Manual local production smoke passed on:

- Desktop homepage, rule detail, checklist detail, and MCP page.
- Mobile homepage and mobile menu.
- Signed-out `/profile` redirects back to the public home page.
- Local `/api/mcp` metadata endpoint returns 200 with 11 tools, prompts, resource templates, and security headers.

## Residual Risks

- `mcp-security-auditor` still reports two high SSRF-looking findings for `new Request(request.url, ...)` in the MCP request adapter. These appear to be static-analysis false positives because no outbound fetch is made, but they should be triaged before calling the security report clean.
- MCP heuristic coverage is 128/135 rules (94.8%). Missing heuristic coverage is a post-launch quality backlog, not a current failing gate.
- React Doctor reports warning-only cleanup: Tailwind `size-*` shorthands, mention embeds using `<img>`, and multi-component mention embed files. Score is 99/100 after fixing the header error.
- Vercel preview verification is blocked until the project uses `apps/web` as root with the Next.js framework preset.
- Production-only checks still need Sentry/OpenPanel env sanity, live `mcp.frontendchecklist.io` behavior, and remote migration readiness review.
