'use client'

import { CATEGORY_COLORS, isValidCategory, routeRulesCategory } from '@repo/config'
import {
  ChevronRight,
  Code2,
  Eye,
  FileCode,
  Globe,
  Image,
  Paintbrush,
  Search,
  Shield,
  TestTube,
  Zap
} from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { type CSSProperties, useMemo } from 'react'
import { useProgress } from '@/hooks/use-progress'

// Icon name type for type safety
export type CategoryIconName =
  | 'fileCode'
  | 'paintbrush'
  | 'code'
  | 'zap'
  | 'eye'
  | 'search'
  | 'image'
  | 'shield'
  | 'globe'
  | 'testTube'

// Map icon names to components
const iconMap = {
  fileCode: FileCode,
  paintbrush: Paintbrush,
  code: Code2,
  zap: Zap,
  eye: Eye,
  search: Search,
  image: Image,
  shield: Shield,
  globe: Globe,
  testTube: TestTube
} as const

interface CategoryColorStyle extends CSSProperties {
  '--category-card-color': string
}

interface CategoryCardProps {
  slug: string
  title: string
  description: string
  ruleIds: string[]
  iconName: CategoryIconName
}

/**
 * Category card with real-time progress tracking.
 * Shows completion progress based on localStorage data.
 */
export function CategoryCard({ slug, title, description, ruleIds, iconName }: CategoryCardProps) {
  // Get the icon component from the map
  const Icon = iconMap[iconName]
  const { getCompletionStats } = useProgress()
  const categoryColor = isValidCategory(slug) ? CATEGORY_COLORS[slug] : 'var(--accent)'
  const categoryStyle: CategoryColorStyle = {
    '--category-card-color': categoryColor
  }

  // Calculate completion stats for this category's rules
  const stats = useMemo(() => {
    return getCompletionStats(ruleIds)
  }, [ruleIds, getCompletionStats])

  const isComplete = stats.completed === stats.total && stats.total > 0

  return (
    <div
      className={cn(
        'group relative rounded-lg p-5',
        'border border-border bg-card',
        'hover:border-[color-mix(in_oklch,var(--category-card-color)_45%,var(--border))] hover:shadow-md',
        'transition-all duration-200',
        isComplete && 'border-l-4 border-l-[var(--category-card-color)]'
      )}
      style={categoryStyle}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'shrink-0 rounded-lg p-2.5',
            'bg-[color-mix(in_oklch,var(--category-card-color)_14%,transparent)]',
            'text-[var(--category-card-color)]',
            'ring-1 ring-[color-mix(in_oklch,var(--category-card-color)_24%,transparent)] ring-inset',
            'transition-colors duration-200'
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3
              className={cn(
                'font-medium text-base text-foreground',
                'transition-colors duration-200 group-hover:text-[var(--category-card-color)]'
              )}
            >
              <Link
                href={routeRulesCategory(slug)}
                className={cn(
                  'after:absolute after:inset-0 after:content-[""]',
                  'focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring'
                )}
              >
                {title}
              </Link>
            </h3>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-foreground-subtle transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--category-card-color)]"
              aria-hidden="true"
            />
          </div>

          {/* Description */}
          <p className="mb-3 line-clamp-2 text-foreground-muted text-sm">{description}</p>

          {/* Progress bar */}
          <div className="space-y-1.5">
            {/* Progress track */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  stats.completed > 0 ? 'bg-[var(--category-card-color)]' : 'bg-transparent'
                )}
                style={{ width: `${stats.percentage}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">
                {stats.completed === 0
                  ? 'Not started'
                  : isComplete
                    ? 'Complete!'
                    : `${stats.percentage}% done`}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {stats.completed}/{stats.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader for CategoryCard
 */
export function CategoryCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-background-muted" />
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-background-muted" />
            <div className="h-4 w-4 rounded bg-background-muted" />
          </div>
          <div className="space-y-1">
            <div className="h-3.5 w-full rounded bg-background-muted" />
            <div className="h-3.5 w-2/3 rounded bg-background-muted" />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-background-muted" />
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded bg-background-muted" />
              <div className="h-3 w-10 rounded bg-background-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
