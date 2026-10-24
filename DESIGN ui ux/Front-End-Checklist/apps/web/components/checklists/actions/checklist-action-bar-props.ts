import type { ChecklistActionBarProps } from '@/components/checklists/actions/checklist-action-bar'

export interface ChecklistActionBarRule {
  id: string
  primaryCategory: string
}

interface BuildChecklistActionBarPropsOptions<TAll extends ChecklistActionBarRule> {
  allRules: TAll[]
  scopeRules?: ChecklistActionBarRule[]
  currentCategory?: string
}

/**
 * Normalizes page rule collections into the prop shape expected by ChecklistActionBar.
 */
export function buildChecklistActionBarProps<TAll extends ChecklistActionBarRule>({
  allRules,
  scopeRules = allRules,
  currentCategory
}: BuildChecklistActionBarPropsOptions<TAll>): ChecklistActionBarProps {
  return {
    allRules: allRules.map(rule => ({ id: rule.id, primaryCategory: rule.primaryCategory })),
    ruleIds: scopeRules.map(rule => rule.id),
    currentCategory
  }
}
