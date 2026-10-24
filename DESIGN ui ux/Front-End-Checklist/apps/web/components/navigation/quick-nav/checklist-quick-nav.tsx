'use client'

import { routeChecklist } from '@repo/config'
import type { LucideIcon } from '@repo/design-system/icons'
import { Eye, ListChecks, Rocket, Search, Shield, Zap } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { useMemo } from 'react'
import { useProgress } from '@/hooks/use-progress'
import { ProgressPillContent, ProgressPillNav, progressPillClassName } from './progress-pill-nav'

const iconMap: Record<string, LucideIcon> = {
  rocket: Rocket,
  search: Search,
  zap: Zap,
  eye: Eye,
  shield: Shield,
  'list-checks': ListChecks
}

interface ChecklistItem {
  slug: string
  title: string
  icon: string
  ruleIds: string[]
}

interface ChecklistQuickNavProps {
  checklists: ChecklistItem[]
}

/** Render checklist quick navigation with icon and progress-aware pills. */
export function ChecklistQuickNav({ checklists }: ChecklistQuickNavProps) {
  if (checklists.length === 0) return null

  return (
    <ProgressPillNav label="Jump to checklist:">
      {checklists.map(checklist => (
        <ChecklistPill key={checklist.slug} checklist={checklist} />
      ))}
    </ProgressPillNav>
  )
}

/** Render a single checklist quick-nav pill. */
function ChecklistPill({ checklist }: { checklist: ChecklistItem }) {
  const { getCompletionStats } = useProgress()
  const stats = useMemo(
    () => getCompletionStats(checklist.ruleIds),
    [checklist.ruleIds, getCompletionStats]
  )
  const Icon = iconMap[checklist.icon] || ListChecks
  const isComplete = stats.completed === stats.total && stats.total > 0

  return (
    <Link
      href={routeChecklist(checklist.slug)}
      className={cn(progressPillClassName, isComplete && 'border-accent/50 bg-accent/5')}
    >
      <ProgressPillContent
        title={checklist.title}
        count={checklist.ruleIds.length}
        isComplete={isComplete}
        hasProgress={stats.completed > 0}
        progressLabel={isComplete ? 'Complete' : `${stats.percentage}% complete`}
        icon={Icon}
      />
    </Link>
  )
}
