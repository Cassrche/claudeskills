'use client'

import { CATEGORY_COLORS, CATEGORY_LABELS, isValidCategory } from '@repo/config'
import { ConfirmDialog } from '@repo/design-system/custom/feedback/confirm-dialog'
import { Focus, Maximize2, RotateCcw } from '@repo/design-system/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@repo/design-system/ui/tooltip'
import { cn } from '@repo/utils'
import { useCallback, useMemo, useState } from 'react'
import {
  type SegmentData,
  SegmentedProgressBar
} from '@/components/feedback/progress/segmented-progress-bar'
import { useProgress } from '@/hooks/use-progress'

export interface ChecklistActionBarProps {
  /** Full rule set for segmented progress bar and total count (all rules for the language). */
  allRules: Array<{ id: string; primaryCategory: string }>
  /** Rule IDs for reset scope (current page or checklist). */
  ruleIds: string[]
  /** Current category slug when on a category or rule detail page. Enables focus toggle. */
  currentCategory?: string
  /** Optional class name */
  className?: string
}

/**
 * Resolve the configured label for a category slug, falling back to the slug when unknown.
 *
 * @param category - Category slug from rule data.
 * @returns Human-readable label for the segmented progress bar.
 */
function getCategoryLabel(category: string): string {
  return isValidCategory(category) ? CATEGORY_LABELS[category] : category
}

/**
 * Resolve the configured color for a category slug, falling back to a neutral color when unknown.
 *
 * @param category - Category slug from rule data.
 * @returns Hex color used by the segmented progress bar.
 */
function getCategoryColor(category: string): string {
  return isValidCategory(category) ? CATEGORY_COLORS[category] : '#6b7280'
}

/**
 * ChecklistActionBar function.
 */
export function ChecklistActionBar({
  allRules,
  ruleIds,
  currentCategory,
  className
}: ChecklistActionBarProps) {
  const { getCompletionStats, isRuleCompleted, resetRulesProgress } = useProgress()
  const stats = useMemo(() => getCompletionStats(ruleIds), [ruleIds, getCompletionStats])

  /** Overall completion across all rules (for counter and segmented bar). */
  const overallStats = useMemo(
    () => getCompletionStats(allRules.map(r => r.id)),
    [allRules, getCompletionStats]
  )

  /** Per-category segments for the progress bar (order stable by category slug). */
  const segments = useMemo((): SegmentData[] => {
    const byCategory = new Map<string, { total: number; completed: number }>()
    for (const rule of allRules) {
      const cat = rule.primaryCategory
      if (!byCategory.has(cat)) byCategory.set(cat, { total: 0, completed: 0 })
      const s = byCategory.get(cat)!
      s.total++
      if (isRuleCompleted(rule.id)) s.completed++
    }
    const sorted = Array.from(byCategory.entries()).sort(([a], [b]) => a.localeCompare(b))
    return sorted.map(([slug, { total, completed }]) => ({
      slug,
      label: getCategoryLabel(slug),
      color: getCategoryColor(slug),
      total,
      completed
    }))
  }, [allRules, isRuleCompleted])

  const [isFocused, setIsFocused] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const canFocus = Boolean(currentCategory)
  const focusedCategory = canFocus && isFocused ? currentCategory : null
  const focusedLabel = focusedCategory ? getCategoryLabel(focusedCategory) : null

  const displayStats = useMemo(() => {
    if (!focusedCategory) return overallStats
    const focusedRuleIds = allRules
      .filter(r => r.primaryCategory === focusedCategory)
      .map(r => r.id)
    return getCompletionStats(focusedRuleIds)
  }, [focusedCategory, overallStats, allRules, getCompletionStats])

  // Reset progress
  const handleConfirmReset = useCallback(() => {
    resetRulesProgress(ruleIds)
    setShowResetConfirm(false)
  }, [ruleIds, resetRulesProgress])

  return (
    <>
      {/* Full-width action bar - sticky at bottom of viewport */}
      <div className={cn('sticky bottom-0 z-40 w-full', 'bg-background', className)}>
        {/* Top border line - full width */}
        <div className="h-px bg-foreground/20" />

        {/* Content with container padding */}
        <div className="container-content py-4">
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-between gap-4">
              {/* Left: Text counter + Segmented progress bar */}
              <div className="flex flex-1 items-center gap-3">
                {/* Text counter */}
                <span className="whitespace-nowrap text-sm tabular-nums">
                  <span className="text-foreground">{displayStats.completed}</span>
                  <span className="text-foreground-muted"> / {displayStats.total}</span>
                  {focusedLabel && (
                    <span className="ml-1 text-foreground-muted text-xs">{focusedLabel}</span>
                  )}
                </span>

                <SegmentedProgressBar
                  segments={segments}
                  totalCompleted={overallStats.completed}
                  totalRules={overallStats.total}
                  focusedCategory={focusedCategory}
                />

                {/* Focus toggle */}
                {canFocus && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setIsFocused(prev => !prev)}
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                          'text-foreground-muted hover:text-foreground',
                          'hover:bg-foreground/10',
                          'transition-colors duration-150',
                          isFocused && 'bg-foreground/10 text-foreground'
                        )}
                        aria-label={isFocused ? 'Show all categories' : `Focus on ${focusedLabel}`}
                        aria-pressed={isFocused}
                      >
                        {isFocused ? (
                          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Focus className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {isFocused ? 'Show all categories' : `Focus: ${focusedLabel}`}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Right: Icon-only action buttons */}
              <div className="flex items-center gap-1">
                {/* Reset progress */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md',
                        'text-foreground-muted hover:text-foreground',
                        'hover:bg-foreground/10',
                        'transition-colors duration-150'
                      )}
                      aria-label="Reset progress"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Reset progress</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
        title="Reset progress?"
        description={
          stats.completed === 0
            ? "You haven't checked any rules yet. There's nothing to reset."
            : `This will uncheck all ${stats.completed} completed ${stats.completed === 1 ? 'item' : 'items'}. This action cannot be undone.`
        }
        confirmLabel={stats.completed === 0 ? 'OK' : 'Reset progress'}
        cancelLabel={stats.completed === 0 ? 'Close' : 'Cancel'}
        variant={stats.completed === 0 ? 'default' : 'danger'}
      />
    </>
  )
}
