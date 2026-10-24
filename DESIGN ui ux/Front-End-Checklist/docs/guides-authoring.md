# Guides Authoring

Guides live in `packages/content/guides/en/` and are a first-class content type separate from the `/guide` help page.

## Supported types

- `how-to`
- `insight`

## Required frontmatter

- `title`
- `description`
- `slug`
- `type`
- `category`
- `tags`
- `publishedAt`
- `updatedAt`
- `coverImage`
- `featured`
- `relatedRules`
- `relatedChecklists`
- `relatedGuides`

If `author` is omitted, the site falls back to the default David Dias profile.

## Required section order

### How-to

1. Intro paragraph before the first H2
2. `## TL;DR`
3. `## Before You Start`
4. `## Steps`
5. `## Examples`
6. `## Common Mistakes`
7. `## Verification`
8. `## Related Checklist`

### Insight

1. Intro paragraph before the first H2
2. `## Context`
3. `## Argument`
4. `## Examples`
5. `## Practical Takeaway`
6. `## Related Checklist`

## Publish checks

Run these from the repo root:

```bash
pnpm validate:guide-structure
pnpm validate:guides
```

The publish validator currently enforces:

- required frontmatter completeness
- required cover image existence in `apps/web/public`
- at least 2 internal links in the body
- at least 1 external authoritative link in the body
- at least 180 words of substantive content
- estimated reading grade no higher than 14

Use [`docs/guide-template.mdx`](/Users/thedaviddias/Projects/frontendchecklist.io/docs/guide-template.mdx) as the starting point for new how-to guides.
