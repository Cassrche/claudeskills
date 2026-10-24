'use client'

import { useMemo, useState } from 'react'
import type { BrowserRule, CategoryGroups, GroupedRules } from './rules-browser-types'

const PRIORITY_ORDER: Array<BrowserRule['priority']> = ['critical', 'high', 'medium', 'low']

interface UseRulesBrowserStateProps {
  rules: BrowserRule[]
  currentCategory?: string
  groupByCategory: boolean
  groupBySubcategory: boolean
  isRuleCompleted: (id: string) => boolean
  getCompletionStats: (ruleIds: string[]) => { completed: number; total: number }
}

/**
 * Manage filtering, sorting, grouping, and aggregate state for the rules browser.
 * @param props - Rules and helpers required to derive browser state.
 * @returns Derived browser state and state mutators.
 */
export function useRulesBrowserState({
  rules,
  currentCategory,
  groupByCategory,
  groupBySubcategory,
  isRuleCompleted,
  getCompletionStats
}: UseRulesBrowserStateProps) {
  const [search, setSearch] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'alphabetical' | 'priority' | 'completion'>('priority')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    rules.forEach(r => {
      set.add(r.primaryCategory)
      r.categories?.forEach(c => set.add(c))
    })
    return Array.from(set).sort()
  }, [rules])

  const allSubcategories = useMemo(() => {
    const set = new Set<string>()
    rules.forEach(r => {
      if (r.subcategory) set.add(r.subcategory)
    })
    return Array.from(set).sort()
  }, [rules])

  const filteredRules = useMemo(() => {
    let result = rules

    if (search?.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          r.primaryCategory.toLowerCase().includes(q) ||
          r.categories?.some(c => c.toLowerCase().includes(q))
      )
    }

    if (priorityFilter !== 'all') {
      result = result.filter(r => r.priority === priorityFilter)
    }

    if (tagFilter !== 'all') {
      result = result.filter(
        r => r.primaryCategory === tagFilter || r.categories?.includes(tagFilter)
      )
    }

    if (subcategoryFilter !== 'all') {
      result = result.filter(r => r.subcategory === subcategoryFilter)
    }

    if (currentCategory) {
      result = result.filter(
        r =>
          r.primaryCategory.toLowerCase() === currentCategory.toLowerCase() ||
          r.categories?.some(c => c.toLowerCase() === currentCategory?.toLowerCase())
      )
    }

    const sorted = [...result].sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'completion') {
        const aDone = isRuleCompleted(a.id) ? 1 : 0
        const bDone = isRuleCompleted(b.id) ? 1 : 0
        if (bDone !== aDone) return aDone - bDone
        return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
      }
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    })

    return sorted
  }, [
    rules,
    search,
    priorityFilter,
    tagFilter,
    subcategoryFilter,
    currentCategory,
    sortBy,
    isRuleCompleted
  ])

  const completionStats = useMemo(
    () => getCompletionStats(filteredRules.map(r => r.id)),
    [filteredRules, getCompletionStats]
  )

  const groupedRules = useMemo((): GroupedRules | null => {
    if (groupByCategory) {
      const categoryGroups: CategoryGroups = {}
      filteredRules.forEach(rule => {
        const cat = rule.primaryCategory
        if (!categoryGroups[cat]) {
          categoryGroups[cat] = { uncategorized: [], groups: {} }
        }
        const sub = rule.subcategory ?? null
        if (!sub) {
          categoryGroups[cat].uncategorized.push(rule)
        } else {
          if (!categoryGroups[cat].groups[sub]) categoryGroups[cat].groups[sub] = []
          categoryGroups[cat].groups[sub].push(rule)
        }
      })
      return { type: 'category', categoryGroups }
    }
    if (groupBySubcategory) {
      const uncategorized: BrowserRule[] = []
      const groups: Record<string, BrowserRule[]> = {}
      filteredRules.forEach(rule => {
        const sub = rule.subcategory ?? null
        if (!sub) {
          uncategorized.push(rule)
        } else {
          if (!groups[sub]) groups[sub] = []
          groups[sub].push(rule)
        }
      })
      return { type: 'subcategory', uncategorized, groups }
    }
    return null
  }, [filteredRules, groupByCategory, groupBySubcategory])

  const clearFilters = useMemo(
    () => () => {
      setSearch(null)
      setPriorityFilter('all')
      setTagFilter('all')
      setSubcategoryFilter('all')
    },
    []
  )

  const setPriorityFilterSafe = useMemo(
    () => (value: string | null) => setPriorityFilter(value ?? 'all'),
    []
  )
  const setTagFilterSafe = useMemo(() => (value: string | null) => setTagFilter(value ?? 'all'), [])
  const setSubcategoryFilterSafe = useMemo(
    () => (value: string | null) => setSubcategoryFilter(value ?? 'all'),
    []
  )

  const hasActiveFilters =
    (search != null && search.trim() !== '') ||
    priorityFilter !== 'all' ||
    tagFilter !== 'all' ||
    subcategoryFilter !== 'all'

  const activeFilterCount = [
    search != null && search.trim() !== '',
    priorityFilter !== 'all',
    tagFilter !== 'all',
    subcategoryFilter !== 'all'
  ].filter(Boolean).length

  return {
    search: search ?? '',
    setSearch,
    priorityFilter,
    setPriorityFilter: setPriorityFilterSafe,
    tagFilter,
    setTagFilter: setTagFilterSafe,
    subcategoryFilter,
    setSubcategoryFilter: setSubcategoryFilterSafe,
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
  }
}
