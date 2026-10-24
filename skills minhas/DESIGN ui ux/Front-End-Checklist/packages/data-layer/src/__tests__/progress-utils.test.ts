import type { Rule } from '@repo/types'
import { calculateProgress, resolveRuleKey } from '../utils'

function createRule(overrides: Partial<Rule> = {}): Rule {
  return {
    title: 'Sample Rule',
    slug: 'sample-rule',
    categories: ['html'],
    priority: 'medium',
    content: 'content',
    primaryCategory: 'html',
    url: '/en/rules/html/sample-rule',
    ...overrides
  }
}

describe('resolveRuleKey', () => {
  it('prefers rule id when available', () => {
    const rule = { ...createRule(), id: 'rule-1' } as Rule
    expect(resolveRuleKey(rule)).toBe('rule-1')
  })

  it('falls back to slug when id is missing', () => {
    const rule = createRule({ slug: 'fallback-slug' })
    expect(resolveRuleKey(rule)).toBe('fallback-slug')
  })
})

describe('calculateProgress', () => {
  it('counts completed rules by id', () => {
    const rules = [
      { ...createRule({ slug: 'first-rule' }), id: 'rule-1' } as Rule,
      { ...createRule({ slug: 'second-rule' }), id: 'rule-2' } as Rule
    ]

    const result = calculateProgress(rules, [{ ruleId: 'rule-1', completed: true }])

    expect(result.total).toBe(2)
    expect(result.completed).toBe(1)
    expect(result.remaining).toBe(1)
    expect(result.percentage).toBe(50)
  })

  it('supports legacy slug-based progress keys', () => {
    const rules = [
      createRule({ slug: 'first-rule' }),
      createRule({ slug: 'second-rule', title: 'Second Rule' })
    ]

    const result = calculateProgress(rules, [{ ruleId: 'first-rule', completed: true }])

    expect(result.total).toBe(2)
    expect(result.completed).toBe(1)
    expect(result.remaining).toBe(1)
    expect(result.percentage).toBe(50)
  })
})
