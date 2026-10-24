'use client'

import { routeRule, routeRules } from '@repo/config'
import { X } from '@repo/design-system/icons'
import type { ChecklistFramework } from '@repo/types'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { RuleRow } from '@/components/rules/listing/rule-row'
import { buildRuleHrefWithFrameworkContext } from '@/lib/framework-preferences'

interface ChecklistRule {
  id: string
  title: string
  description?: string
  slug: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  categories: string[]
  subcategory?: string | null
}

interface ChecklistRulesSectionProps {
  checklistName: string
  framework?: ChecklistFramework
  rules: ChecklistRule[]
  onRemoveRule: (ruleId: string) => void
}

/**
 * Render the checklist rule list and its empty state.
 *
 * @param props - Rule list props.
 */
export function ChecklistRulesSection({
  checklistName,
  framework,
  rules,
  onRemoveRule
}: ChecklistRulesSectionProps) {
  if (rules.length === 0) {
    return (
      <div className="border-border border-t py-16 text-center">
        <p className="mb-4 text-foreground-muted">
          No rules in this checklist yet. Browse rules and add them here.
        </p>
        <Link
          href={routeRules()}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2',
            'bg-accent text-accent-foreground',
            'transition-colors hover:bg-accent/90',
            'font-medium text-sm'
          )}
        >
          Browse Rules
        </Link>
      </div>
    )
  }

  return (
    <ul className="list-none border-border-subtle border-t">
      {rules.map(rule => (
        <ChecklistRuleListItem
          key={rule.id}
          checklistName={checklistName}
          framework={framework}
          rule={rule}
          onRemove={() => onRemoveRule(rule.id)}
        />
      ))}
    </ul>
  )
}

interface ChecklistRuleListItemProps {
  checklistName: string
  framework?: ChecklistFramework
  rule: ChecklistRule
  onRemove: () => void
}

/**
 * Render a single checklist rule row with an inline remove action.
 * @param props - Rule display props and remove handler.
 */
function ChecklistRuleListItem({
  checklistName,
  framework,
  rule,
  onRemove
}: ChecklistRuleListItemProps) {
  return (
    <li className="group relative">
      <RuleRow
        id={rule.id}
        title={rule.title}
        description={rule.description}
        priority={rule.priority}
        categories={rule.categories}
        subcategory={rule.subcategory}
        href={buildRuleHrefWithFrameworkContext(
          routeRule(rule.primaryCategory, rule.slug),
          framework,
          checklistName
        )}
      />
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'absolute top-1/2 right-2 z-10 -translate-y-1/2',
          'rounded-md p-1.5',
          'text-foreground-muted hover:text-red-600 dark:hover:text-red-400',
          'transition-colors hover:bg-red-50 dark:hover:bg-red-950/30',
          'opacity-0 focus:opacity-100 group-hover:opacity-100'
        )}
        aria-label={`Remove ${rule.title} from checklist`}
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}
