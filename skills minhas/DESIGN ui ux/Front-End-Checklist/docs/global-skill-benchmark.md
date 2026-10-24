# Global Skill Benchmark

## Goal

Benchmark one aggregate Front-End Checklist skill against popular `skills.sh` audit and review skills using real findings, not just prompt quality.

## Source Of Truth

The rule corpus is the product. The global skill is a generated aggregate over those rules.

When the benchmark exposes weak output, the default order of operations is:

1. improve the relevant rules
2. regenerate the global skill
3. rerun the affected fixtures
4. compare again

Only use pure prompt tuning when the rule corpus is already decision-complete and the loss is clearly aggregation behavior rather than missing knowledge.

## Aggregate Skill

The aggregate skill is generated at:

- `skills/frontend-checklist-global/SKILL.md`

It is intentionally a router, not a 374-rule prompt dump. It points agents to the Front-End Checklist MCP tools:

- `review_code` for file or snippet review
- `audit_url` for public-page audits
- `search_rules`, `get_rule`, `fix_rule`, `explain_rule` for targeted remediation
- `get_workflow`, `get_checklist_rules`, `get_quick_reference` for broader guidance

That design keeps the skill current as rules change and avoids duplicating the rule corpus into a static skill file.

## How To Test

1. Regenerate skills:

```bash
pnpm generate:skills
```

2. Run the local benchmark on the main codebase:

```bash
pnpm benchmark:global-skill
```

3. If you want a narrower run, pass directories:

```bash
pnpm tsx scripts/benchmark-global-skill.ts apps/web
pnpm tsx scripts/benchmark-global-skill.ts packages/design-system
```

## Benchmark Criteria

Use the same criteria for every competing skill:

1. Zero-setup execution in a default agent environment
2. Real findings on a local repo, with exact file references
3. Breadth across frontend concerns, not just one slice like performance
4. Rule-grounded remediation instead of generic advice
5. Repeatability across runs
6. Honest scope boundaries

## Comparison Set

These are strong comparison targets because they are either popular or close to the same problem space:

- `squirrelscan/skills:audit-website`
- `addyosmani/web-quality-skills:web-quality-audit`
- `cloudflare/skills:web-perf`
- `coderabbitai/skills:code-review`

## Expected Positioning

Front-End Checklist should win on:

- Local repo audits with no extra vendor login
- Rule-grounded remediation tied to a named corpus
- Breadth across accessibility, performance, SEO, security, images, and general frontend quality

Front-End Checklist should not claim to beat specialized tools at everything:

- `web-perf` should remain better for runtime trace-based performance analysis on a live page
- `audit-website` should remain stronger for multi-page live-site crawling
- `code-review` may remain better for PR-diff workflows tightly coupled to its own review service

If the aggregate skill starts underperforming on local repo findings, that is a signal to improve `review_code` heuristics rather than expand the skill prompt.

## Current Conclusion

The benchmark work established a few durable conclusions:

- A single global Front-End Checklist skill is viable, but only when it is strongly derived from the rule corpus.
- Pairwise judging is more useful than coarse heuristic scoring for ranking competing skills.
- Safe-pattern fixtures are essential because many competing skills over-report decorative images, fragment-only components, and framework-managed metadata.
- Repo-derived compound fixtures are the best discriminator for frontend breadth, prioritization, and remediation quality.

This benchmark should remain part of the ongoing maintenance loop for the rule corpus and the generated global skill.

## Current Caveat

The current local benchmark is useful for recall, but some component-level findings still need manual verification.
The recent `review_code` precision pass reduced React heading-fragment noise substantially.
The main remaining noise in this repo is:

- form-label checks on reusable input primitives or test fixtures
- empty-alt handling where decorative images may be valid but the heuristic treats them as suspicious
- page-component metadata checks on files that rely on framework metadata APIs instead of literal head tags
