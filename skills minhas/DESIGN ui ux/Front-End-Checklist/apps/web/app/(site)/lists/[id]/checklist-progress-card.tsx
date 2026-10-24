'use client'

import { cn } from '@repo/utils'

interface ChecklistStats {
  total: number
  completed: number
  percentage: number
  remaining: number
}

interface ChecklistProgressCardProps {
  stats: ChecklistStats
  onResetProgress: () => void
}

/**
 * Render the checklist completion summary card.
 *
 * @param props - Progress stats and reset handler.
 */
export function ChecklistProgressCard({ stats, onResetProgress }: ChecklistProgressCardProps) {
  const isComplete = stats.completed === stats.total && stats.total > 0

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-foreground text-sm">Progress</span>
        <span className="text-foreground-muted text-sm">
          {stats.completed}/{stats.total} complete
        </span>
      </div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            stats.completed > 0 ? 'bg-accent' : 'bg-transparent'
          )}
          style={{ width: `${stats.percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground-muted">
          {isComplete ? 'All done!' : `${stats.remaining} remaining`}
        </span>
        {stats.completed > 0 && (
          <button type="button" onClick={onResetProgress} className="text-accent hover:underline">
            Reset progress
          </button>
        )}
      </div>
    </div>
  )
}
