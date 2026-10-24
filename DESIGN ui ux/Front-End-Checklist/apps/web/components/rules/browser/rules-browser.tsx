'use client'

import { STORAGE_KEYS } from '@repo/config'
import { storage } from '@repo/storage'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useProgress } from '@/hooks/use-progress'
import { RulesBrowserSkeleton } from './rules-browser-headers'
import { RulesBrowserRenderer } from './rules-browser-renderer'
import { RulesBrowserToolbar } from './rules-browser-toolbar'
import type { RulesBrowserProps } from './rules-browser-types'
import { useRulesBrowserState } from './use-rules-browser-state'

const RULES_EXPANDED_KEY = STORAGE_KEYS.RULES_EXPANDED

/** Restores the set of expanded rule IDs from localStorage. */
function loadExpandedRules(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const stored = storage.getLocal<string[]>(RULES_EXPANDED_KEY)
  return new Set(Array.isArray(stored) ? stored : [])
}

const priorityOptions = ['all', 'critical', 'high', 'medium', 'low'] as const
const sortOptions = [
  { value: 'alphabetical', label: 'A-Z' },
  { value: 'priority', label: 'Priority' },
  { value: 'completion', label: 'Progress' }
] as const

const EMPTY_SUBCATEGORY_DESCRIPTIONS: Record<string, string> = {}

/**
 * Browse, search, filter, and group frontend rules.
 *
 * @param props - Rules dataset and display options.
 */
export function RulesBrowser({
  rules,
  groupByCategory = false,
  groupBySubcategory = false,
  currentCategory,
  subcategoryDescriptions = EMPTY_SUBCATEGORY_DESCRIPTIONS,
  enableCategoryLinks = false
}: RulesBrowserProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [expandedRules, setExpandedRules] = useState<Set<string>>(() => new Set())

  const { isRuleCompleted, resetRulesProgress, markRulesComplete, getCompletionStats } =
    useProgress()

  const {
    search,
    setSearch,
    priorityFilter,
    setPriorityFilter,
    tagFilter,
    setTagFilter,
    subcategoryFilter,
    setSubcategoryFilter,
    sortBy,
    setSortBy,
    allTags,
    allSubcategories,
    filteredRules,
    completionStats,
    groupedRules,
    clearFilters,
    hasActiveFilters,
    activeFilterCount
  } = useRulesBrowserState({
    rules,
    currentCategory,
    groupByCategory,
    groupBySubcategory,
    isRuleCompleted,
    getCompletionStats
  })

  // Default: all folded. expandedRules = IDs user has expanded (persisted).
  useEffect(() => {
    storage.setLocal(RULES_EXPANDED_KEY, Array.from(expandedRules))
  }, [expandedRules])

  // Load persisted expanded state after mount to avoid SSR/localStorage hydration mismatch
  useEffect(() => {
    setExpandedRules(loadExpandedRules())
  }, [])

  const handleRuleExpandToggle = useCallback((ruleId: string, expanded: boolean) => {
    setExpandedRules(prev => {
      const next = new Set(prev)
      if (expanded) {
        next.add(ruleId)
      } else {
        next.delete(ruleId)
      }
      return next
    })
  }, [])

  const handleExpandAll = useCallback(() => {
    setExpandedRules(new Set(filteredRules.map(r => r.id)))
  }, [filteredRules])

  const handleCollapseAll = useCallback(() => {
    setExpandedRules(new Set())
  }, [])

  const handleExpandRules = useCallback((ruleIds: string[]) => {
    setExpandedRules(prev => {
      const next = new Set(prev)
      ruleIds.forEach(id => next.add(id))
      return next
    })
  }, [])

  const handleCollapseRules = useCallback((ruleIds: string[]) => {
    setExpandedRules(prev => {
      const next = new Set(prev)
      ruleIds.forEach(id => next.delete(id))
      return next
    })
  }, [])

  const areAllExpanded = useCallback(
    (ruleIds: string[]) => ruleIds.length > 0 && ruleIds.every(id => expandedRules.has(id)),
    [expandedRules]
  )

  const hasAnyExpanded = expandedRules.size > 0

  const handleCheckAll = useCallback(() => {
    markRulesComplete(rules.map(r => r.id))
  }, [rules, markRulesComplete])

  const handleUncheckAll = useCallback(() => {
    resetRulesProgress(rules.map(r => r.id))
  }, [rules, resetRulesProgress])

  const handleCheckRules = useCallback(
    (ruleIds: string[]) => {
      markRulesComplete(ruleIds)
    },
    [markRulesComplete]
  )

  const handleUncheckRules = useCallback(
    (ruleIds: string[]) => {
      resetRulesProgress(ruleIds)
    },
    [resetRulesProgress]
  )

  const areAllChecked = useCallback(
    (ruleIds: string[]) => ruleIds.length > 0 && ruleIds.every(id => isRuleCompleted(id)),
    [isRuleCompleted]
  )

  const allRulesChecked = useMemo(
    () => rules.length > 0 && rules.every(r => isRuleCompleted(r.id)),
    [rules, isRuleCompleted]
  )

  const handleSortByChange = useCallback(
    (value: string) => {
      if (value === 'alphabetical' || value === 'priority' || value === 'completion') {
        setSortBy(value)
      }
    },
    [setSortBy]
  )

  const handleResetClick = useCallback(() => {
    setShowResetConfirm(true)
  }, [])

  const handleConfirmReset = useCallback(() => {
    resetRulesProgress(filteredRules.map(rule => rule.id))
    setShowResetConfirm(false)
  }, [filteredRules, resetRulesProgress])

  const handleCancelReset = useCallback(() => {
    setShowResetConfirm(false)
  }, [])

  return (
    <div className="space-y-6">
      <RulesBrowserToolbar
        search={search}
        setSearch={setSearch}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        hasActiveFilters={Boolean(hasActiveFilters)}
        activeFilterCount={activeFilterCount}
        hasAnyExpanded={hasAnyExpanded}
        allRulesChecked={allRulesChecked}
        handleCollapseAll={handleCollapseAll}
        handleExpandAll={handleExpandAll}
        handleUncheckAll={handleUncheckAll}
        handleCheckAll={handleCheckAll}
        handleResetClick={handleResetClick}
        showResetConfirm={showResetConfirm}
        handleConfirmReset={handleConfirmReset}
        handleCancelReset={handleCancelReset}
        completionStats={completionStats}
        priorityOptions={priorityOptions}
        priorityFilter={priorityFilter}
        setPriorityFilter={value => setPriorityFilter(value)}
        allTags={allTags}
        tagFilter={tagFilter}
        setTagFilter={value => setTagFilter(value)}
        allSubcategories={allSubcategories}
        subcategoryFilter={subcategoryFilter}
        setSubcategoryFilter={value => setSubcategoryFilter(value)}
        sortOptions={sortOptions}
        sortBy={sortBy}
        setSortBy={handleSortByChange}
        clearFilters={clearFilters}
      />

      {filteredRules.length > 0 ? (
        <RulesBrowserRenderer
          groupedRules={groupedRules}
          filteredRules={filteredRules}
          currentCategory={currentCategory}
          subcategoryDescriptions={subcategoryDescriptions}
          expandedRules={expandedRules}
          handleRuleExpandToggle={handleRuleExpandToggle}
          areAllExpanded={areAllExpanded}
          handleExpandRules={handleExpandRules}
          handleCollapseRules={handleCollapseRules}
          areAllChecked={areAllChecked}
          handleCheckRules={handleCheckRules}
          handleUncheckRules={handleUncheckRules}
          enableCategoryLinks={enableCategoryLinks}
        />
      ) : (
        <div className="py-16 text-center">
          <p className="text-foreground-muted">No rules found matching your filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-accent text-sm hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}

export { RulesBrowserSkeleton }
