# Rule Structure Guide

Front-End Checklist rules now use one machine-detectable core body contract:

1. Intro paragraph before any H2
2. `## Code Example` or `## Code Examples`
3. `## Why It Matters`
4. Optional implementation or guidance sections
5. `## Verification`

Rule Contract V2 adds lightweight, conditional guidance:

- `## Exceptions` for nuanced or false-positive-prone rules
- `### Automated Checks` and `### Manual Checks` inside `## Verification` when both apply
- `## Browser Support`, `## Support Notes`, or `## Standards` when compatibility or compliance materially affects implementation

Browser support notes should come from the repo browser policy in `.browserslistrc` plus package-backed compatibility data.

## Inline link contract

Body prose may include natural inline links when they directly support a sentence-level claim, comparison, or implementation recommendation.

- Keep `sources` as the authoritative evidence registry.
- Keep `resources` for further reading, tools, and optional secondary references.
- Keep `relatedRules` as the discovery graph for dedicated related-rule UI.
- Do not add standalone metadata paragraphs such as `See also ...` or `Reference: ...`.
- Aim for light-touch density: usually `2-5` inline links per rule, with `0-1` in the intro, `1-3` across the main guidance sections, and `0-1` internal rule link unless the rule is unusually interconnected.
- Prefer newer inline secondary articles only when they add practical or current context that the evergreen primary sources do not already cover well.
- When you mention a specific tool for the first meaningful time in the prose, link that first mention if the tool is genuinely useful to the reader and already appears in `resources` or `tools`.
- Keep secondary article links curated. Good defaults are well-established practitioner sources such as CSS-Tricks, Smashing Magazine, NN/g, WebAIM, Screaming Frog, Sitebulb, Moz, or Yoast.
- Use descriptive anchor text that names the concept or claim being supported.

## Required rules

- `## Code Example(s)` must appear before `## Why It Matters`
- `## Why It Matters` must appear before `## Verification`
- `## Verification` must be the final H2
- Optional H2 sections belong between `## Why It Matters` and `## Verification`

## Preferred optional headings

- `## Best Practices`
- `## Common Mistakes`
- `## Framework Examples`
- `## Tools & Validation`
- `## Thresholds`
- `## Exceptions`
- `## Browser Support`
- `## Support Notes`
- `## Standards`
- `## Implementation Notes`

The validator reports headings outside this taxonomy so new one-off section names do not spread silently.

## Conditional V2 sections

Use `## Exceptions` when the rule needs caveats, false-positive guidance, or valid exceptions.

Use `## Browser Support` or `## Support Notes` when a rule depends on feature support, environment differences, or fallback strategy.

Use `## Standards` when a visible WCAG, spec, Google, or policy mapping changes implementation decisions.

Inside `## Verification`, prefer:

```md
## Verification

### Automated Checks

- CI, lint, crawler, Lighthouse, axe, or script-based validation

### Manual Checks

- Browser, assistive tech, visual, or judgment-based validation
```

Keep a compact flat verification list only when the rule is too simple to justify the split.

## Before

```md
Short intro paragraph.

## Basic Implementation

...

## Testing

...

## Accessibility Considerations

...
```

## After

```md
Short intro paragraph.

## Code Example

...

## Why It Matters

...

## Accessibility Considerations

...

## Verification

...
```

## Commands

```bash
pnpm validate:rule-structure
pnpm validate:rule-structure --report
pnpm report:v2-gaps
pnpm report:rule-links
pnpm generate:exceptions-hints
pnpm generate:support-notes
pnpm generate:verification-split
pnpm normalize:rule-structure --report
pnpm normalize:rule-structure --write
```
