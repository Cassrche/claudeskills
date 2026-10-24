'use client'

import { ChevronDown } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { getChecklistCuration } from '@/components/checklists/checklist-curation'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'
import { ChecklistCard, ChecklistCardSkeleton } from './checklist-card'

interface Checklist {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  rules: string[]
  estimatedTime?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  featured?: boolean
  language: string
}

interface ChecklistBrowserProps {
  checklists: Checklist[]
  /** Map of rule reference (category/slug) to rule ID for progress tracking */
  ruleRefToId: Record<string, string>
}

const difficultyOptions = ['all', 'beginner', 'intermediate', 'advanced'] as const

/**
 * Browse and filter curated checklists
 */
export function ChecklistBrowser({ checklists, ruleRefToId }: ChecklistBrowserProps) {
  // URL state management
  const [difficultyFilter, setDifficultyFilter] = useQueryState(
    'difficulty',
    parseAsStringEnum(['all', 'beginner', 'intermediate', 'advanced']).withDefault('all')
  )
  const [sortBy, setSortBy] = useQueryState(
    'sort',
    parseAsStringEnum(['featured', 'alphabetical', 'rules']).withDefault('featured')
  )

  /** Track and update the selected checklist difficulty filter. */
  const handleDifficultyChange = (difficulty: (typeof difficultyOptions)[number]) => {
    trackInteraction(TELEMETRY_EVENTS.filterChanged, {
      label: 'checklist_difficulty_filter',
      location: 'checklist_browser',
      target: difficulty
    })
    setDifficultyFilter(difficulty)
  }

  /** Track and update the checklist sort order. */
  const handleSortChange = (value: string) => {
    trackInteraction(TELEMETRY_EVENTS.filterChanged, {
      label: 'checklist_sort',
      location: 'checklist_browser',
      target: value
    })
    setSortBy(value === 'alphabetical' || value === 'rules' ? value : 'featured')
  }

  // Filter and sort checklists
  const filteredChecklists = useMemo(() => {
    let result = [...checklists]

    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      result = result.filter(c => c.difficulty === difficultyFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'featured':
          // Featured first, then by order
          if (a.featured !== b.featured) return a.featured ? -1 : 1
          return a.title.localeCompare(b.title)
        case 'alphabetical':
          return a.title.localeCompare(b.title)
        case 'rules':
          return b.rules.length - a.rules.length
        default:
          return 0
      }
    })

    return result
  }, [checklists, difficultyFilter, sortBy])

  // Convert rule references to rule IDs for each checklist
  const getChecklistRuleIds = (checklist: Checklist): string[] => {
    return checklist.rules
      .map(ref => ruleRefToId[ref])
      .filter((id): id is string => id !== undefined)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Difficulty Filter */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background-subtle p-1">
          {difficultyOptions.map(difficulty => (
            <button
              key={difficulty}
              type="button"
              onClick={() => handleDifficultyChange(difficulty)}
              aria-pressed={difficultyFilter === difficulty}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium text-[13px] transition-all duration-150',
                difficultyFilter === difficulty
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              )}
            >
              {difficulty === 'all'
                ? 'All'
                : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Sort Dropdown */}
        <div className="relative">
          <label htmlFor="sort-checklists" className="sr-only">
            Sort by
          </label>
          <select
            id="sort-checklists"
            value={sortBy}
            onChange={e => handleSortChange(e.target.value)}
            className={cn(
              'h-9 appearance-none rounded-lg pr-8 pl-3',
              'border border-border bg-background',
              'text-foreground text-sm',
              'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50',
              'cursor-pointer transition-all duration-150'
            )}
          >
            <option value="featured">Featured first</option>
            <option value="alphabetical">A-Z</option>
            <option value="rules">Most rules</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        </div>
      </div>

      {/* Results count */}
      <output className="block text-foreground-muted text-sm" aria-live="polite">
        {filteredChecklists.length === checklists.length ? (
          <>
            <span className="font-medium text-foreground">{checklists.length}</span> checklists
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{filteredChecklists.length}</span> of{' '}
            {checklists.length} checklists
          </>
        )}
      </output>

      {/* Checklists Grid */}
      {filteredChecklists.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredChecklists.map(checklist => {
            const curation = getChecklistCuration(checklist.slug)

            return (
              <ChecklistCard
                key={checklist.id}
                slug={checklist.slug}
                title={checklist.title}
                description={checklist.description}
                icon={checklist.icon}
                ruleIds={getChecklistRuleIds(checklist)}
                estimatedTime={checklist.estimatedTime}
                difficulty={checklist.difficulty}
                featured={checklist.featured}
                label={curation?.label}
                audience={curation?.audience}
                whenToUse={curation?.whenToUse}
              />
            )
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-foreground-muted">No checklists match your filters.</p>
          <button
            type="button"
            onClick={() => handleDifficultyChange('all')}
            className="mt-2 text-accent text-sm hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton loader for ChecklistBrowser
 */
export function ChecklistBrowserSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {/* Filter skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-background-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-background-muted" />
      </div>

      {/* Count skeleton */}
      <div className="h-4 w-24 animate-pulse rounded bg-background-muted" />

      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }).map((_, i) => (
          <ChecklistCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
