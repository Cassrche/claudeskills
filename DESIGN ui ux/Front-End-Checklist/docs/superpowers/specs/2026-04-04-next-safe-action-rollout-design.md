# next-safe-action Rollout Design

## Goal

Adopt `next-safe-action` for internal authenticated mutations that are currently implemented as client `fetch("/api/...")` calls, while keeping public and externally callable routes as route handlers.

## Scope

This rollout covers:

- profile updates
- user checklist create/update/delete/share mutations

This rollout does not cover:

- MCP endpoints
- waitlist or subscribe forms
- audit saving
- progress mutations

## Approach

1. Add a shared safe-action client in the web app with:
   - flattened validation errors
   - auth middleware for signed-in actions
   - centralized error handling that still reports failures to Sentry/OpenPanel
2. Extract shared server-side profile and checklist logic into service modules.
3. Implement safe actions for profile and checklist mutations on top of those services.
4. Update client hooks/components to call the safe actions instead of internal mutation routes.
5. Keep existing GET routes and keep public/external route handlers unchanged.

## Why This Scope

- It improves the mutation surfaces that are fully internal to the app.
- It removes repeated `request.json()` parsing and ad hoc client `fetch` boilerplate.
- It avoids forcing `next-safe-action` onto endpoints that still need explicit HTTP boundaries.
- It keeps the rollout small enough to validate quickly.

## Risks

- Client-side hooks currently rely on React Query invalidation and optimistic state; migration must preserve that behavior.
- Checklist mutations currently use bot protection, so the safe-action path must keep equivalent protection.
- The worktree already contains unrelated homepage copy edits, so this rollout must avoid touching that file.

## Success Criteria

- Profile save flows work through safe actions.
- Checklist create/update/delete/share flows work through safe actions.
- Existing authenticated UI behavior and telemetry remain intact.
- `pnpm --filter web lint`, `pnpm run typecheck --filter=web`, and `pnpm run build --filter=web` pass.
