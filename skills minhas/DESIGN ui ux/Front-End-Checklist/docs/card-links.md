# Card link pattern (stretched link)

Card-style navigation in the web app uses a **stretched link** pattern so that:

1. The link's accessible name is the card title (good for screen readers and SEO).
2. The whole card is clickable (good for touch and UX).
3. The link lives in the DOM where it semantically belongs — wrapping the title.

## Pattern

- **Container**: A `div` or `article` with `position: relative` and the card's visual styles (border, padding, hover). Add `group` for Tailwind group-hover effects.
- **Title link**: The `<a>` or `<Link>` wraps **only the title text** inside the `<h3>` (or equivalent heading). It uses `::after` to expand its hit area to fill the card:

  ```tsx
  <h3 className="...">
    <Link
      href="/destination"
      className={cn(
        'after:absolute after:inset-0 after:content-[""]',
        'focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:rounded-xl'
      )}
    >
      {title}
    </Link>
  </h3>
  ```

  Because the link is `position: static` (the default), its `::after` pseudo-element with `position: absolute` is positioned relative to the nearest positioned ancestor — the card container.
- **Content**: All other visible content (description, pills, icons) lives as normal siblings. No `z-index` is needed for non-interactive content.
- **Secondary actions**: Buttons or links (e.g. "GitHub") need `position: relative; z-index: 10` to stay clickable above the stretched `::after`.

Do **not** use a separate overlay `<a>` with `absolute inset-0` as a sibling. The link should wrap the title and stretch from there.

## External links

For external links, use `<a>` instead of `<Link>`:

```tsx
<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  className={cn(
    'after:absolute after:inset-0 after:content-[""]',
    'focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:rounded-xl'
  )}
>
  {title}
</a>
```

## Reference components

- `apps/web/app/[lang]/rules/[category]/[slug]/related-rules-section.tsx` — related rule cards
- `apps/web/app/[lang]/rules/[category]/[slug]/_components/resource-card.tsx` — `ResourceCard`, `ToolCard`
- `apps/web/app/[lang]/checklists/_components/checklist-card.tsx` — `ChecklistCard`
- `apps/web/app/[lang]/_components/homepage/category-card.tsx` — `CategoryCard`
- `apps/web/app/[lang]/about/_components/creator-projects.tsx` — `ProjectCard`
- `apps/web/components/mentions/embeds/mention-embeds.tsx` — `ArticleEmbed`
- `apps/web/components/mentions/embeds/mention-embeds-compact.tsx` — `YouTubeEmbedCompact`, `ArticleEmbedCompact`

## Checklist rule

This pattern is recommended in the **Provide sufficient touch target size** rule (`packages/content/rules/en/accessibility/touch-targets.mdx`) under "Card and list item links."
