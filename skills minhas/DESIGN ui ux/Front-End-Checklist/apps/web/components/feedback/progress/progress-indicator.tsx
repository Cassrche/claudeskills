'use client'

import { Progress } from '@repo/design-system/ui/progress'
import { useProgress } from '@/hooks/use-progress'

interface ProgressIndicatorProps {
  ruleIds?: string[]
  category?: string
  className?: string
  showDetails?: boolean
}

/** Displays a progress bar with completion stats for a set of rules or a category. */
export function ProgressIndicator({
  ruleIds,
  category,
  className = '',
  showDetails = false
}: ProgressIndicatorProps) {
  const { getCompletionStats } = useProgress()
  const stats = getCompletionStats(ruleIds)

  if (stats.total === 0) {
    return null
  }

  return (
    <div className={`progress-indicator ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-foreground text-sm">
          {category ? `${category} Progress` : 'Progress'}
        </span>
        <span className="text-foreground-muted text-sm">
          {stats.completed} of {stats.total} completed
        </span>
      </div>

      <Progress
        value={stats.percentage}
        className="h-2"
        aria-label={`${stats.percentage}% complete`}
      />

      {showDetails ? (
        <div className="mt-2 text-foreground-muted text-xs">
          <div className="flex justify-between">
            <span>{stats.percentage}% complete</span>
            <span>{stats.remaining} remaining</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface CategoryProgressProps {
  rules: Array<{ id: string; primaryCategory: string }>
  className?: string
}

/** Renders per-category progress bars showing completion percentages. */
export function CategoryProgress({ rules, className = '' }: CategoryProgressProps) {
  const { getCategoryStats } = useProgress()
  const categoryStats = getCategoryStats(rules)

  return (
    <div className={`category-progress ${className}`}>
      <h3 className="mb-4 font-semibold text-foreground text-lg">Progress by Category</h3>

      <div className="space-y-4">
        {categoryStats.map(({ category, total, completed, percentage }) => (
          <div key={category} className="category-progress-item">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-foreground text-sm capitalize">{category}</span>
              <span className="text-foreground-muted text-sm">
                {completed}/{total}
              </span>
            </div>

            <Progress
              value={percentage}
              className="h-2"
              aria-label={`${category}: ${percentage}% complete`}
            />

            <div className="mt-1 text-foreground-muted text-xs">{percentage}% complete</div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface OverallProgressProps {
  totalRules: number
  className?: string
}

/** Renders the overall completion percentage and progress bar for all rules. */
export function OverallProgress({ totalRules, className = '' }: OverallProgressProps) {
  const { getCompletionStats } = useProgress()
  const stats = getCompletionStats()

  return (
    <div className={`overall-progress ${className}`}>
      <div className="text-center">
        <div className="mb-2 font-bold text-3xl text-foreground">{stats.percentage}%</div>
        <div className="mb-4 text-foreground-muted text-sm">
          {stats.completed} of {totalRules} rules completed
        </div>

        <Progress
          value={stats.percentage}
          className="mx-auto h-3 max-w-xs"
          aria-label={`Overall progress: ${stats.percentage}% complete`}
        />

        <div className="mt-2 text-foreground-muted text-xs">{stats.remaining} rules remaining</div>
      </div>
    </div>
  )
}
