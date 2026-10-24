import type { FilterOptions, Rule, SortOptions, UserProgress } from '@repo/types'
import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useCallback, useMemo } from 'react'
import { queryKeys } from './client'
import { useBulkUpdateProgress, useToggleRule, useUpdateProgress } from './mutations'
import { useRulesWithProgress, useSearchRules } from './queries'
import { calculateProgress, resolveRuleKey, sortRules } from './utils'

/** Filter rules by whether corresponding progress entries are complete. */
export function filterRulesByCompletion(
  rules: Rule[],
  progress: Map<string, UserProgress>,
  completed: boolean
): Rule[] {
  const completedIds = new Set(
    Array.from(progress.entries())
      .filter(([_, item]) => item.completed)
      .map(([id]) => id)
  )

  if (completed) {
    return rules.filter(rule => completedIds.has(resolveRuleKey(rule)))
  }

  return rules.filter(rule => !completedIds.has(resolveRuleKey(rule)))
}

// Hook for complete rule management
/**
 * Hook for managing rules with filtering and sorting
 * @param filters - Optional filter options
 * @param sort - Optional sort options
 * @returns Rule manager functions and data
 */
export function useRuleManager(filters?: FilterOptions, sort?: SortOptions) {
  const { data: rulesData, isLoading, error } = useRulesWithProgress()
  const toggleMutation = useToggleRule()
  const updateMutation = useUpdateProgress()

  // Apply filters and sorting
  const processedRules = useMemo(() => {
    if (!rulesData) return []

    let rules = [...rulesData.rules]

    // Apply filters
    if (filters) {
      if (filters.categories && filters.categories.length > 0) {
        rules = rules.filter(rule => rule.categories.some(cat => filters.categories?.includes(cat)))
      }

      if (filters.priorities && filters.priorities.length > 0) {
        rules = rules.filter(rule => filters.priorities?.includes(rule.priority))
      }

      if (filters.completed !== undefined) {
        rules = filterRulesByCompletion(rules, rulesData.progress, filters.completed)
      }
    }

    // Apply sorting
    if (sort) {
      const sortField =
        sort.field === 'completion' || sort.field === 'title'
          ? 'alphabetical'
          : (sort.field as 'priority' | 'category' | 'alphabetical')
      rules = sortRules(rules, sortField, sort.order)
    }

    return rules
  }, [rulesData, filters, sort])

  // Get progress for a specific rule
  const getRuleProgress = useCallback(
    (ruleId: string): UserProgress | undefined => {
      return rulesData?.progress.get(ruleId)
    },
    [rulesData]
  )

  // Check if a rule is completed
  const isRuleCompleted = useCallback(
    (ruleId: string): boolean => {
      return getRuleProgress(ruleId)?.completed || false
    },
    [getRuleProgress]
  )

  // Toggle rule completion
  const toggleRule = useCallback(
    async (ruleId: string) => {
      await toggleMutation.mutateAsync(ruleId)
    },
    [toggleMutation]
  )

  // Update rule with notes
  const updateRule = useCallback(
    async (ruleId: string, completed: boolean, notes?: string) => {
      await updateMutation.mutateAsync({ ruleId, completed, notes })
    },
    [updateMutation]
  )

  // Get statistics
  const stats = useMemo(() => {
    if (!rulesData) {
      return {
        total: 0,
        completed: 0,
        remaining: 0,
        percentage: 0,
        byCategory: new Map(),
        byPriority: new Map()
      }
    }

    const progressArray = Array.from(rulesData.progress.entries()).map(([id, p]) => ({
      ruleId: id,
      completed: p.completed
    }))

    return calculateProgress(processedRules, progressArray)
  }, [rulesData, processedRules])

  return {
    rules: processedRules,
    isLoading,
    error,
    getRuleProgress,
    isRuleCompleted,
    toggleRule,
    updateRule,
    stats,
    isUpdating: toggleMutation.isPending || updateMutation.isPending
  }
}

// Hook for search functionality
/**
 * Hook for searching rules
 * @returns Search functions and state
 */
export function useRuleSearch() {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading } = useSearchRules(debouncedQuery)

  return {
    query,
    setQuery,
    results: results || [],
    isSearching: isLoading,
    hasQuery: debouncedQuery.length >= 2
  }
}

// Hook for bulk operations
/**
 * Hook for bulk rule operations
 * @returns Bulk operation functions
 */
export function useBulkOperations() {
  const queryClient = useQueryClient()
  const bulkUpdate = useBulkUpdateProgress()

  const markAllAsCompleted = useCallback(
    async (ruleIds: string[]) => {
      const updates: UserProgress[] = ruleIds.map(id => ({
        ruleId: id,
        completed: true,
        completedAt: new Date()
      }))

      await bulkUpdate.mutateAsync(updates)
    },
    [bulkUpdate]
  )

  const markAllAsIncomplete = useCallback(
    async (ruleIds: string[]) => {
      const updates: UserProgress[] = ruleIds.map(id => ({
        ruleId: id,
        completed: false,
        completedAt: undefined
      }))

      await bulkUpdate.mutateAsync(updates)
    },
    [bulkUpdate]
  )

  const markCategoryAsCompleted = useCallback(
    async (category: string) => {
      const rules = queryClient.getQueryData(queryKeys.byCategory(category)) as Rule[] | undefined
      if (rules && Array.isArray(rules)) {
        await markAllAsCompleted(rules.map(rule => resolveRuleKey(rule)))
      }
    },
    [queryClient, markAllAsCompleted]
  )

  const markPriorityAsCompleted = useCallback(
    async (priority: string) => {
      const rules = queryClient.getQueryData(queryKeys.byPriority(priority)) as Rule[] | undefined
      if (rules && Array.isArray(rules)) {
        await markAllAsCompleted(rules.map(rule => resolveRuleKey(rule)))
      }
    },
    [queryClient, markAllAsCompleted]
  )

  return {
    markAllAsCompleted,
    markAllAsIncomplete,
    markCategoryAsCompleted,
    markPriorityAsCompleted,
    isProcessing: bulkUpdate.isPending
  }
}

// Hook for optimistic updates
/**
 * Hook for optimistic rule toggling
 * @returns Toggle functions with optimistic updates
 */
export function useOptimisticToggle() {
  const queryClient = useQueryClient()
  const toggleMutation = useToggleRule()

  const optimisticToggle = useCallback(
    (ruleId: string) => {
      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.progress(), (old: UserProgress[] = []) => {
        const existing = old.find(p => p.ruleId === ruleId)

        if (existing) {
          return old.map(p =>
            p.ruleId === ruleId
              ? {
                  ...p,
                  completed: !p.completed,
                  completedAt: !p.completed ? new Date() : undefined
                }
              : p
          )
        } else {
          return [
            ...old,
            {
              ruleId,
              completed: true,
              completedAt: new Date()
            }
          ]
        }
      })

      // Perform the actual mutation
      return toggleMutation.mutate(ruleId, {
        onError: () => {
          // Revert on error
          queryClient.invalidateQueries({ queryKey: queryKeys.progress() })
        }
      })
    },
    [queryClient, toggleMutation]
  )

  return optimisticToggle
}

// Re-export for convenience
