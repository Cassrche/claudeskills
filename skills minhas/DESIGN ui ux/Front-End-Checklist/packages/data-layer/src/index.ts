// Client exports
export {
  defaultQueryClientOptions,
  getQueryClient,
  initializeQueryClient,
  mutationKeys,
  queryKeys
} from './client'
// Hook exports
export {
  useBulkOperations,
  useOptimisticToggle,
  useRuleManager,
  useRuleSearch
} from './hooks'

// Mutation exports
export {
  useBulkUpdateProgress,
  useClearAllData,
  useExportData,
  useImportData,
  useToggleRule,
  useUpdatePreferences,
  useUpdateProgress
} from './mutations'
// Query exports
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
} from './queries'

// Utility exports
export {
  calculateProgress,
  fetchRuleBySlug,
  fetchRules,
  groupRulesByCategory,
  groupRulesByPriority,
  highlightSearchTerms,
  searchRules,
  sortRules
} from './utils'
