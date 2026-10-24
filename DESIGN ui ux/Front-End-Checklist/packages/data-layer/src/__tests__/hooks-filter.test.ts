import type { Rule, UserProgress } from '@repo/types'
import { filterRulesByCompletion } from '../hooks'

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

describe('filterRulesByCompletion', () => {
  it('matches completed rules using id-based keys', () => {
    const rules = [
      { ...createRule({ slug: 'legacy-slug' }), id: 'rule-1' } as Rule,
      { ...createRule({ slug: 'second-rule' }), id: 'rule-2', title: 'Second Rule' } as Rule
    ]

    const progress = new Map<string, UserProgress>([
      ['rule-1', { ruleId: 'rule-1', completed: true }]
    ])

    const completed = filterRulesByCompletion(rules, progress, true)
    expect(completed).toHaveLength(1)
    expect(completed[0].slug).toBe('legacy-slug')
  })

  it('matches completed rules using legacy slug keys', () => {
    const rules = [
      createRule({ slug: 'legacy-slug' }),
      createRule({ slug: 'second-rule', title: 'Second Rule' })
    ]

    const progress = new Map<string, UserProgress>([
      ['legacy-slug', { ruleId: 'legacy-slug', completed: true }]
    ])

    const completed = filterRulesByCompletion(rules, progress, true)
    const notCompleted = filterRulesByCompletion(rules, progress, false)

    expect(completed).toHaveLength(1)
    expect(completed[0].slug).toBe('legacy-slug')
    expect(notCompleted).toHaveLength(1)
    expect(notCompleted[0].slug).toBe('second-rule')
  })
})
