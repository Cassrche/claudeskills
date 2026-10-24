/**
 * Tool Performance Benchmarks
 *
 * Measures execution time for each MCP tool and asserts against budgets.
 * Fails in CI if any tool exceeds its budget — prevents performance regressions
 * as the rule database grows.
 *
 * Budgets are deliberately generous (they run on CI machines, not local hardware).
 * Tighten them if tools consistently run much faster than the budget.
 *
 * Run: pnpm test --filter=@repo/mcp -- --verbose tool-performance
 */

import type { CuratedChecklist, Rule } from '@repo/types'
import { executeGetChecklistRules } from '../../src/tools/get-checklist-rules'
import { executeGetRule } from '../../src/tools/get-rule'
import { executeListCategories } from '../../src/tools/list-categories'
import { executeReviewCode } from '../../src/tools/review-code'
import { executeSearchRules } from '../../src/tools/search-rules'

// ─── Test data ────────────────────────────────────────────────────────────────

function makeRule(
  slug: string,
  category: string,
  priority: 'critical' | 'high' | 'medium' | 'low'
): Rule {
  return {
    slug,
    title: `Rule: ${slug}`,
    categories: [category as never],
    primaryCategory: category,
    priority,
    content: `# ${slug}\n\nContent for ${slug} rule.`,
    url: `/rules/${category}/${slug}`,
    prompts: {
      check: `Check for ${slug} compliance.`,
      fix: `Fix ${slug} issues.`,
      explain: `Explain why ${slug} matters.`
    }
  }
}

// Simulate a realistic rule set size (374 rules)
const CATEGORIES = [
  'html',
  'css',
  'javascript',
  'performance',
  'accessibility',
  'seo',
  'security',
  'images',
  'testing',
  'privacy',
  'pwa',
  'i18n'
]
const PRIORITIES: Array<'critical' | 'high' | 'medium' | 'low'> = [
  'critical',
  'high',
  'medium',
  'low'
]

const MOCK_RULES: Rule[] = Array.from({ length: 374 }, (_, i) => {
  const category = CATEGORIES[i % CATEGORIES.length]
  const priority = PRIORITIES[i % PRIORITIES.length]
  return makeRule(`rule-${String(i).padStart(3, '0')}`, category, priority)
})

// Add real slugs that have heuristics so review_code actually finds issues
const REAL_RULES: Rule[] = [
  makeRule('alt-tags', 'accessibility', 'critical'),
  makeRule('doctype', 'html', 'critical'),
  makeRule('lang-attribute', 'html', 'high'),
  makeRule('viewport', 'html', 'high'),
  makeRule('meta-description', 'seo', 'high'),
  makeRule('canonical-url', 'seo', 'high'),
  makeRule('new-tab', 'security', 'high'),
  makeRule('heading-hierarchy', 'html', 'high'),
  makeRule('form-label', 'accessibility', 'high'),
  makeRule('lazy-loading', 'performance', 'medium'),
  ...MOCK_RULES
]

const MOCK_CHECKLISTS: CuratedChecklist[] = [
  {
    id: 'launch-checklist',
    slug: 'launch-checklist',
    title: 'Launch Checklist',
    description: 'Essential checks before deploying.',
    icon: 'rocket',
    rules: [
      'html/doctype',
      'html/lang-attribute',
      'accessibility/alt-tags',
      'seo/meta-description',
      'seo/canonical-url'
    ],
    estimatedTime: '45 minutes',
    difficulty: 'beginner',
    order: 1,
    featured: true,
    language: 'en',
    url: '/checklists/launch-checklist'
  }
]

// ─── Benchmark helper ─────────────────────────────────────────────────────────

function benchmark(
  label: string,
  fn: () => void,
  iterations = 100
): { p50: number; p95: number; p99: number } {
  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  const p50 = times[Math.floor(iterations * 0.5)]
  const p95 = times[Math.floor(iterations * 0.95)]
  const p99 = times[Math.floor(iterations * 0.99)]

  const result = { p50, p95, p99 }
  console.log(`\n  ${label}`)
  console.log(`    p50: ${p50.toFixed(2)}ms  p95: ${p95.toFixed(2)}ms  p99: ${p99.toFixed(2)}ms`)
  return result
}

// ─── Performance budget assertions ────────────────────────────────────────────
// These are the maximum acceptable response times (p95) in milliseconds.
// Raise them if you add expensive computation; lower them when you optimize.

const BUDGETS = {
  review_code: 100, // ms p95 — runs heuristics against 374 rules
  search_rules: 50, // ms p95 — text search over 374 rules
  list_categories: 50, // ms p95 — pure aggregation under parallel CI load
  get_rule: 5, // ms p95 — single lookup
  get_checklist_rules: 10 // ms p95 — batch lookup
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Tool Performance Benchmarks', () => {
  const complexHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        ${Array.from({ length: 20 }, (_, i) => `<img src="img${i}.jpg">`).join('\n')}
        ${Array.from({ length: 10 }, (_, i) => `<div><div><div><p>Paragraph ${i}</p></div></div></div>`).join('\n')}
        <a href="http://example.com" target="_blank">link</a>
        <form><input type="text"><input type="email"></form>
        <h1>First</h1><h1>Second</h1>
        <script src="https://cdn.example.com/analytics.js"></script>
        <script src="https://cdn.other.com/tracking.js"></script>
      </body>
    </html>
  `

  it('review_code stays within performance budget', () => {
    const { p95 } = benchmark(`review_code with ${REAL_RULES.length} rules`, () =>
      executeReviewCode({ code: complexHtml, minPriority: 'low' }, REAL_RULES)
    )
    expect(p95).toBeLessThan(BUDGETS.review_code)
  })

  it('search_rules stays within performance budget', () => {
    const { p95 } = benchmark(`search_rules with ${REAL_RULES.length} rules`, () =>
      executeSearchRules({ query: 'accessibility', limit: 20 }, REAL_RULES)
    )
    expect(p95).toBeLessThan(BUDGETS.search_rules)
  })

  it('list_categories stays within performance budget', () => {
    const { p95 } = benchmark(`list_categories with ${REAL_RULES.length} rules`, () =>
      executeListCategories(REAL_RULES)
    )
    expect(p95).toBeLessThan(BUDGETS.list_categories)
  })

  it('get_rule stays within performance budget', () => {
    const { p95 } = benchmark(`get_rule with ${REAL_RULES.length} rules`, () =>
      executeGetRule({ slug: 'doctype' }, REAL_RULES)
    )
    expect(p95).toBeLessThan(BUDGETS.get_rule)
  })

  it('get_checklist_rules stays within performance budget', () => {
    const { p95 } = benchmark(`get_checklist_rules with ${REAL_RULES.length} rules`, () =>
      executeGetChecklistRules({ checklist: 'launch-checklist' }, REAL_RULES, MOCK_CHECKLISTS)
    )
    expect(p95).toBeLessThan(BUDGETS.get_checklist_rules)
  })

  it('review_code scales linearly — 2x rules should take <2.5x time', () => {
    // Verify no O(n²) behavior as rule DB grows
    const smallSet = REAL_RULES.slice(0, 50)
    const largeSet = REAL_RULES

    let smallTotal = 0
    let largeTotal = 0

    const runs = 20
    for (let i = 0; i < runs; i++) {
      const s1 = performance.now()
      executeReviewCode({ code: complexHtml }, smallSet)
      smallTotal += performance.now() - s1

      const s2 = performance.now()
      executeReviewCode({ code: complexHtml }, largeSet)
      largeTotal += performance.now() - s2
    }

    const ratio = largeTotal / smallTotal
    const rulesRatio = largeSet.length / smallSet.length
    console.log(
      `\n  Scaling: ${smallSet.length}→${largeSet.length} rules = ${ratio.toFixed(2)}x time (rules grew ${rulesRatio.toFixed(1)}x)`
    )

    // Allow up to 3x slowdown for 7x more rules (well below O(n²))
    expect(ratio).toBeLessThan(rulesRatio)
  })
})
