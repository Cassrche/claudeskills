'use client'

import { cn } from '@repo/utils'

interface SkeletonProps {
  className?: string
}

const SKELETON_CARD_KEYS = ['line-1', 'line-2', 'line-3', 'line-4', 'line-5']
const SKELETON_BENTO_KEYS = ['card-1', 'card-2', 'card-3', 'card-4']

/**
 * Render a single skeleton block.
 * @param props - Skeleton styling props.
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-foreground/10', className)} />
}

interface SkeletonCardProps {
  className?: string
  hasIcon?: boolean
  lines?: number
}

/**
 * Render a card-shaped skeleton placeholder.
 * @param props - Skeleton card display props.
 */
export function SkeletonCard({ className, hasIcon = true, lines = 2 }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6', className)}>
      <div className="flex items-start gap-4">
        {hasIcon && <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          {SKELETON_CARD_KEYS.slice(0, lines).map(key => (
            <Skeleton key={key} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

interface SkeletonBentoProps {
  className?: string
}

/**
 * Render a bento-grid skeleton placeholder layout.
 * @param props - Skeleton bento styling props.
 */
export function SkeletonBento({ className }: SkeletonBentoProps) {
  return (
    <div className={cn('grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Large cards */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 md:col-span-2 lg:row-span-2">
        <Skeleton className="mb-6 h-24 w-full rounded-lg sm:h-32" />
        <Skeleton className="mb-2 h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 md:col-span-2 lg:row-span-2">
        <Skeleton className="mb-6 h-24 w-full rounded-lg sm:h-32" />
        <Skeleton className="mb-2 h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-3/4" />
      </div>
      {/* Small cards */}
      {SKELETON_BENTO_KEYS.map(key => (
        <div key={key} className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <Skeleton className="mb-6 h-24 w-full rounded-lg sm:h-32" />
          <Skeleton className="mb-2 h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}

interface SkeletonStatsProps {
  className?: string
  count?: number
}

/**
 * Render statistic card skeleton placeholders.
 * @param props - Skeleton stats display props.
 */
export function SkeletonStats({ className, count = 4 }: SkeletonStatsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-12', className)}>
      {SKELETON_BENTO_KEYS.slice(0, count).map(key => (
        <div key={key} className="flex flex-col items-center gap-2 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-10 w-16" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
