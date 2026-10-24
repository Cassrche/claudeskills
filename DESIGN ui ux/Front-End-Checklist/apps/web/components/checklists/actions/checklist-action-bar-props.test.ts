import { buildChecklistActionBarProps } from '@/components/checklists/actions/checklist-action-bar-props'

describe('buildChecklistActionBarProps', () => {
  const allRules = [
    { id: 'rule-1', primaryCategory: 'html', title: 'One' },
    { id: 'rule-2', primaryCategory: 'css', title: 'Two' },
    { id: 'rule-3', primaryCategory: 'html', title: 'Three' }
  ]

  it('uses all rules as the default scope', () => {
    expect(buildChecklistActionBarProps({ allRules })).toEqual({
      allRules: [
        { id: 'rule-1', primaryCategory: 'html' },
        { id: 'rule-2', primaryCategory: 'css' },
        { id: 'rule-3', primaryCategory: 'html' }
      ],
      ruleIds: ['rule-1', 'rule-2', 'rule-3'],
      currentCategory: undefined
    })
  })

  it('supports a narrower checklist or detail scope', () => {
    expect(
      buildChecklistActionBarProps({
        allRules,
        scopeRules: [allRules[0], allRules[2]]
      })
    ).toEqual({
      allRules: [
        { id: 'rule-1', primaryCategory: 'html' },
        { id: 'rule-2', primaryCategory: 'css' },
        { id: 'rule-3', primaryCategory: 'html' }
      ],
      ruleIds: ['rule-1', 'rule-3'],
      currentCategory: undefined
    })
  })

  it('preserves the optional current category focus', () => {
    expect(
      buildChecklistActionBarProps({
        allRules,
        scopeRules: [allRules[0], allRules[2]],
        currentCategory: 'html'
      })
    ).toEqual({
      allRules: [
        { id: 'rule-1', primaryCategory: 'html' },
        { id: 'rule-2', primaryCategory: 'css' },
        { id: 'rule-3', primaryCategory: 'html' }
      ],
      ruleIds: ['rule-1', 'rule-3'],
      currentCategory: 'html'
    })
  })
})
