# `@frontendchecklist/rules`

Public Front-End Checklist rules package intended for external consumers.

## What it exports

- Stable rule types
- `loadRules()` to read normalized rule records
- Packaged rule content for published installs

## Local development

Inside the monorepo, `loadRules()` falls back to `packages/content/rules/en` when the packaged
copy does not exist yet.

## Publishing

`prepack` runs `pnpm sync:rules`, which copies the public rule MDX files into the package so
external consumers do not need repo-relative access.
