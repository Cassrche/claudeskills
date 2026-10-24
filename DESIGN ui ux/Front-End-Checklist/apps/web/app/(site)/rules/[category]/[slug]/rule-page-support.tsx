import { routeRulesCategory } from '@repo/config'
import { Sparkles } from '@repo/design-system/icons'
import { cn, formatTechTerm } from '@repo/utils'
import Link from 'next/link'
import { categoryBadgeStyles, priorityBadgeStyles } from '@/lib/badge-styles'

export const categoryColors = categoryBadgeStyles

interface PriorityIndicatorProps {
  priority: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Render the priority badge used on rule detail pages.
 *
 * @param props - Priority label props.
 */
export function PriorityIndicator({ priority }: PriorityIndicatorProps) {
  const config = priorityBadgeStyles[priority]
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1',
        config.surface
      )}
    >
      <div className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      <span className="font-medium text-xs">{config.label}</span>
    </div>
  )
}

/**
 * Render the compact priority eyebrow shown alongside rule category pills.
 *
 * @param props - Priority label props.
 */
export function PriorityEyebrow({ priority }: PriorityIndicatorProps) {
  const config = priorityBadgeStyles[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold text-[11px] uppercase tracking-[0.18em]',
        config.surface
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

/**
 * Render the quick-take summary card for rule pages.
 *
 * @param props - Summary bullet items and supporting metadata.
 */
export function RuleQuickTakeCard({
  items,
  whyItMatters,
  typicalFixTime
}: {
  items?: string[]
  whyItMatters?: string | null
  typicalFixTime?: number
}) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-background/85 p-5 shadow-sm sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>Quick take</span>
        </div>
        {typeof typicalFixTime === 'number' && (
          <span className="text-foreground-muted text-xs uppercase tracking-[0.18em]">
            Typical fix time {typicalFixTime} min
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {items.map(item => (
          <li key={item} className="flex items-start gap-3 text-foreground text-sm leading-6">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {whyItMatters && (
        <div className="mt-5 border-border/80 border-t pt-4 text-foreground-muted text-sm leading-6">
          <span className="font-medium text-foreground">Why it matters:</span> {whyItMatters}
        </div>
      )}
    </div>
  )
}

interface RuleCategoryChipsProps {
  categories: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Render category chips and the priority eyebrow for the rule page header.
 *
 * @param props - Category and priority metadata.
 */
export function RuleCategoryChips({ categories, priority }: RuleCategoryChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {categories.map(category => (
        <Link
          key={category}
          href={routeRulesCategory(category)}
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1 font-medium text-[11px] uppercase tracking-[0.18em]',
            'transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            categoryColors[category.toLowerCase()] ||
              'border-border bg-background-muted text-foreground-muted'
          )}
        >
          {formatTechTerm(category)}
        </Link>
      ))}
      <PriorityEyebrow priority={priority} />
    </div>
  )
}
