import { cn, formatTechTerm } from '@repo/utils'
import { categoryBadgeStyles, priorityBadgeStyles } from '@/lib/badge-styles'

interface RuleRowBadgesProps {
  categories: string[]
  currentCategory?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  isCompleted: boolean
  mobile?: boolean
  children?: React.ReactNode
}

/** Render category and priority badges shared by desktop and mobile rule row layouts. */
export function RuleRowBadges({
  categories,
  currentCategory,
  priority,
  isCompleted,
  mobile = false,
  children
}: RuleRowBadgesProps) {
  const config = priorityBadgeStyles[priority]
  const visibilityClass = mobile ? 'inline-flex sm:hidden' : 'hidden sm:inline-flex'

  return (
    <>
      {categories
        .filter(cat => cat.toLowerCase() !== currentCategory?.toLowerCase())
        .map(cat => (
          <span
            key={cat}
            className={cn(
              visibilityClass,
              'shrink-0 items-center rounded-full border px-3 py-1',
              'font-medium text-[11px] uppercase tracking-[0.18em]',
              categoryBadgeStyles[cat.toLowerCase()] ||
                'border-border bg-background-muted text-foreground-muted',
              isCompleted && 'opacity-70'
            )}
          >
            {formatTechTerm(cat)}
          </span>
        ))}

      <span
        className={cn(
          visibilityClass,
          'shrink-0 items-center gap-1.5 rounded-full border px-3 py-1',
          'font-semibold text-[11px] uppercase tracking-[0.18em]',
          config.surface,
          isCompleted && 'opacity-70'
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
        {config.label}
      </span>

      {children}
    </>
  )
}
