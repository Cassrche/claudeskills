import { storage } from '@repo/storage'
import type {
  Category,
  FilterOptions,
  Priority,
  Rule,
  UserPreferences,
  UserProgress
} from '@repo/types'
import { type UseQueryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from './client'
import { fetchRuleBySlug, fetchRules, searchRules } from './utils'

/** Query all rules. */
function useRules(options?: UseQueryOptions<Rule[], Error>) {
  return useQuery({
    queryKey: queryKeys.all,
    queryFn: fetchRules,
    ...options
  })
}

/** Query a single rule by slug. */
function useRule(slug: string, options?: UseQueryOptions<Rule | null, Error>) {
  return useQuery({
    queryKey: queryKeys.detail(slug),
    queryFn: () => fetchRuleBySlug(slug),
    enabled: !!slug,
    ...options
  })
}

/** Query rules for a category. */
function useRulesByCategory(category: Category, options?: UseQueryOptions<Rule[], Error>) {
  return useQuery({
    queryKey: queryKeys.byCategory(category),
    queryFn: async () => {
      const rules = await fetchRules()
      return rules.filter(rule => rule.categories.includes(category))
    },
    enabled: !!category,
    ...options
  })
}

/** Query rules for a priority. */
function useRulesByPriority(priority: Priority, options?: UseQueryOptions<Rule[], Error>) {
  return useQuery({
    queryKey: queryKeys.byPriority(priority),
    queryFn: async () => {
      const rules = await fetchRules()
      return rules.filter(rule => rule.priority === priority)
    },
    enabled: !!priority,
    ...options
  })
}

/** Query rules using the supplied filter options. */
function useFilteredRules(filters: FilterOptions, options?: UseQueryOptions<Rule[], Error>) {
  return useQuery({
    queryKey: queryKeys.list(filters),
    queryFn: async () => {
      let rules = await fetchRules()

      // Apply category filter
      if (filters.categories && filters.categories.length > 0) {
        rules = rules.filter(rule => rule.categories.some(cat => filters.categories?.includes(cat)))
      }

      // Apply priority filter
      if (filters.priorities && filters.priorities.length > 0) {
        rules = rules.filter(rule => filters.priorities?.includes(rule.priority))
      }

      // Apply search query
      if (filters.query) {
        rules = await searchRules(filters.query, rules)
      }

      return rules
    },
    ...options
  })
}

/** Query rules matching a search term. */
function useSearchRules(query: string, options?: UseQueryOptions<Rule[], Error>) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => searchRules(query),
    enabled: query.length >= 2, // Minimum query length
    ...options
  })
}

/** Query saved user progress. */
function useProgress(options?: UseQueryOptions<UserProgress[], Error>) {
  return useQuery({
    queryKey: queryKeys.progress(),
    queryFn: () => storage.loadProgress(),
    ...options
  })
}

/** Query saved user preferences. */
function usePreferences(options?: UseQueryOptions<UserPreferences | null, Error>) {
  return useQuery({
    queryKey: queryKeys.preferences(),
    queryFn: () => storage.loadPreferences(),
    ...options
  })
}

/** Query rules together with saved progress and completion stats. */
function useRulesWithProgress(
  options?: UseQueryOptions<
    {
      rules: Rule[]
      progress: Map<string, UserProgress>
      stats: {
        total: number
        completed: number
        percentage: number
      }
    },
    Error
  >
) {
  return useQuery({
    queryKey: [...queryKeys.all, ...queryKeys.progress()],
    queryFn: async () => {
      const [rules, progressArray] = await Promise.all([fetchRules(), storage.loadProgress()])

      const progressMap = new Map(progressArray.map(p => [p.ruleId, p]))

      const completed = progressArray.filter(p => p.completed).length

      return {
        rules,
        progress: progressMap,
        stats: {
          total: rules.length,
          completed,
          percentage: rules.length > 0 ? (completed / rules.length) * 100 : 0
        }
      }
    },
    ...options
  })
}

/** Prefetch all rules into a query client. */
async function prefetchRules(queryClient: {
  prefetchQuery: (options: unknown) => Promise<unknown>
}) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.all,
    queryFn: fetchRules
  })
}

/** Prefetch one rule into a query client. */
async function prefetchRule(
  queryClient: { prefetchQuery: (options: unknown) => Promise<unknown> },
  slug: string
) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.detail(slug),
    queryFn: () => fetchRuleBySlug(slug)
  })
}

/** Prefetch category rules into a query client. */
async function prefetchRulesByCategory(
  queryClient: { prefetchQuery: (options: unknown) => Promise<unknown> },
  category: Category
) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.byCategory(category),
    queryFn: async () => {
      const rules = await fetchRules()
      return rules.filter(rule => rule.categories.includes(category))
    }
  })
}

export {
  prefetchRule,
  prefetchRules,
  prefetchRulesByCategory,
  useFilteredRules,
  usePreferences,
  useProgress,
  useRule,
  useRules,
  useRulesByCategory,
  useRulesByPriority,
  useRulesWithProgress,
  useSearchRules
}
