'use client'

import { cn } from '@repo/utils'
import { useMemo } from 'react'
import { useProgress } from '@/hooks/use-progress'
import { ProgressPillContent, ProgressPillNav, progressPillClassName } from './progress-pill-nav'

interface CategoryItem {
  slug: string
  title: string
  ruleCount: number
  ruleIds: string[]
}

interface CategoryQuickNavProps {
  categories: CategoryItem[]
}

/** Render category quick navigation with progress-aware pills. */
export function CategoryQuickNav({ categories }: CategoryQuickNavProps) {
  if (categories.length === 0) return null

  return (
    <ProgressPillNav label="Jump to category:">
      {categories.map(category => (
        <CategoryPill key={category.slug} category={category} />
      ))}
    </ProgressPillNav>
  )
}

/** Render a single category quick-nav pill with progress state. */
function CategoryPill({ category }: { category: CategoryItem }) {
  const { getCompletionStats } = useProgress()
  const stats = useMemo(
    () => getCompletionStats(category.ruleIds),
    [category.ruleIds, getCompletionStats]
  )
  const isComplete = stats.completed === stats.total && stats.total > 0

  return (
    <a
      href={`#${category.slug}`}
      className={cn(progressPillClassName, isComplete && 'border-accent/50 bg-accent/5')}
    >
      <ProgressPillContent
        title={category.title}
        count={category.ruleCount}
        isComplete={isComplete}
        hasProgress={stats.completed > 0}
        progressLabel={isComplete ? 'Complete' : `${stats.percentage}% complete`}
        titleClassName="capitalize"
      />
    </a>
  )
}
