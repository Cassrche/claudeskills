'use client'

import { routeChecklist } from '@repo/config'
import type { LucideIcon } from '@repo/design-system/icons'
import {
  Braces,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
  FlaskConical,
  Gauge,
  Image,
  ListChecks,
  Rocket,
  Search,
  Shield,
  Zap
} from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { useMemo } from 'react'
import {
  CHECKLIST_AUDIENCE_LABELS,
  type ChecklistAudience
} from '@/components/checklists/checklist-curation'
import { ChecklistDifficultyBadge } from '@/components/checklists/checklist-difficulty-badge'
import { useProgress } from '@/hooks/use-progress'

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  rocket: Rocket,
  search: Search,
  zap: Zap,
  braces: Braces,
  eye: Eye,
  shield: Shield,
  gauge: Gauge,
  image: Image,
  'flask-conical': FlaskConical,
  'file-check': FileCheck,
  'list-checks': ListChecks
}

interface ChecklistCardProps {
  slug: string
  title: string
  description: string
  icon: string
  ruleIds: string[]
  estimatedTime?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  featured?: boolean
  label?: string
  audience?: ChecklistAudience[]
  whenToUse?: string
}

/**
 * Checklist card with real-time progress tracking.
 * Shows completion progress based on localStorage data.
 */
export function ChecklistCard({
  slug,
  title,
  description,
  icon,
  ruleIds,
  estimatedTime,
  difficulty = 'intermediate',
  featured = false,
  label,
  audience = [],
  whenToUse
}: ChecklistCardProps) {
  // Get the icon component from the map, default to ListChecks
  const Icon = iconMap[icon] || ListChecks
  const { getCompletionStats } = useProgress()

  // Calculate completion stats for this checklist's rules
  const stats = useMemo(() => {
    return getCompletionStats(ruleIds)
  }, [ruleIds, getCompletionStats])

  const isComplete = stats.completed === stats.total && stats.total > 0

  return (
    <div
      className={cn(
        'group relative rounded-xl p-6',
        'border border-border bg-card',
        'hover:border-border-focus hover:shadow-md',
        'transition-all duration-200',
        isComplete && 'border-l-4 border-l-accent',
        featured && 'ring-1 ring-accent/20'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'shrink-0 rounded-xl p-3',
            'bg-accent/10',
            'text-accent',
            'transition-colors duration-200'
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3
              className={cn(
                'font-medium text-base text-foreground',
                'transition-colors duration-200 group-hover:text-accent'
              )}
            >
              <Link
                href={routeChecklist(slug)}
                className={cn(
                  'after:absolute after:inset-0 after:content-[""]',
                  'focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring'
                )}
              >
                {title}
              </Link>
            </h3>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-foreground-subtle transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
              aria-hidden="true"
            />
          </div>

          {/* Description */}
          <p className="mb-4 line-clamp-2 text-foreground-muted text-sm">{description}</p>

          {(label || audience.length > 0) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {label ? (
                <span className="rounded-full border border-border bg-background-subtle px-2.5 py-1 text-[11px] text-foreground-subtle uppercase tracking-[0.14em]">
                  {label}
                </span>
              ) : null}
              {audience.map(entry => (
                <span
                  key={entry}
                  className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent"
                >
                  {CHECKLIST_AUDIENCE_LABELS[entry]}
                </span>
              ))}
            </div>
          )}

          {whenToUse ? (
            <p className="mb-4 line-clamp-2 text-foreground-subtle text-xs leading-relaxed">
              {whenToUse}
            </p>
          ) : null}

          {/* Meta info */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-foreground-muted text-xs">
            <span className="flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 text-accent/70" aria-hidden="true" />
              {ruleIds.length} rules
            </span>
            {estimatedTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent/70" aria-hidden="true" />
                {estimatedTime}
              </span>
            )}
            <ChecklistDifficultyBadge difficulty={difficulty} />
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            {/* Progress track */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  stats.completed > 0 ? 'bg-accent' : 'bg-transparent'
                )}
                style={{ width: `${stats.percentage}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-[11px]">
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
 * Skeleton loader for ChecklistCard
 */
export function ChecklistCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-background-muted" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 rounded bg-background-muted" />
            <div className="h-5 w-5 rounded bg-background-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded bg-background-muted" />
            <div className="h-4 w-3/4 rounded bg-background-muted" />
          </div>
          <div className="flex gap-3">
            <div className="h-5 w-20 rounded bg-background-muted" />
            <div className="h-5 w-24 rounded bg-background-muted" />
            <div className="h-5 w-16 rounded bg-background-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-background-muted" />
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded bg-background-muted" />
              <div className="h-3 w-8 rounded bg-background-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
