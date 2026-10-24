import { storage } from '@repo/storage'
import type { ExportData, ExportOptions, Rule, UserPreferences, UserProgress } from '@repo/types'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mutationKeys, queryKeys } from './client'
import { resolveRuleKey } from './utils'

/**
 * Build export payload from rules, progress, and preferences using stable rule identifiers.
 *
 * @param input - Export inputs and filtering options.
 * @returns The normalized export payload.
 */
export function buildExportData(input: {
  exportOptions: ExportOptions
  progress: UserProgress[]
  preferences: UserPreferences | null
  rules: Rule[]
}): ExportData {
  const { exportOptions, progress, preferences, rules } = input
  let filteredRules = [...rules]
  const progressByRuleId = new Map(progress.map(item => [item.ruleId, item]))

  if (exportOptions.categories && exportOptions.categories.length > 0) {
    filteredRules = filteredRules.filter(rule =>
      rule.categories.some(category => exportOptions.categories?.includes(category))
    )
  }

  if (exportOptions.priorities && exportOptions.priorities.length > 0) {
    filteredRules = filteredRules.filter(rule => exportOptions.priorities?.includes(rule.priority))
  }

  if (!exportOptions.includeCompleted) {
    filteredRules = filteredRules.filter(rule => {
      const progressItem = progressByRuleId.get(resolveRuleKey(rule))
      return !progressItem?.completed
    })
  }

  const allowedRuleIds = new Set(filteredRules.map(rule => resolveRuleKey(rule)))
  let filteredProgress = progress.filter(item => allowedRuleIds.has(item.ruleId))

  if (!exportOptions.includeNotes) {
    filteredProgress = filteredProgress.map(item => ({ ...item, notes: undefined }))
  }

  const completedCount = filteredRules.reduce((count, rule) => {
    const progressItem = progressByRuleId.get(resolveRuleKey(rule))
    return progressItem?.completed ? count + 1 : count
  }, 0)

  return {
    metadata: {
      exportedAt: new Date(),
      version: '2.0.0',
      totalRules: filteredRules.length,
      completedRules: completedCount,
      progress: filteredRules.length > 0 ? (completedCount / filteredRules.length) * 100 : 0
    },
    rules: filteredRules,
    progress: filteredProgress,
    preferences: preferences || undefined
  }
}

/**
 * Export checklist data from local storage and cached rules.
 *
 * @param options - Optional mutation configuration.
 * @returns A React Query mutation for exporting checklist data.
 */
export function useExportData(options?: UseMutationOptions<ExportData, Error, ExportOptions>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.exportData(),
    mutationFn: async exportOptions => {
      const [progress, preferences, rules] = await Promise.all([
        storage.loadProgress(),
        storage.loadPreferences(),
        queryClient.getQueryData<Rule[]>(queryKeys.all)
      ])

      return buildExportData({
        exportOptions,
        progress,
        preferences,
        rules: rules || []
      })
    },
    ...options
  })
}
