import { validateImportData, validateUserPreferences, validateUserProgress } from '@repo/schemas'
import { storage } from '@repo/storage'
import type { UserPreferences, UserProgress } from '@repo/types'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mutationKeys, queryKeys } from './client'

export { buildExportData, useExportData } from './export-mutations'

// Update single rule progress
/**
 * useUpdateProgress function.
 */
export function useUpdateProgress(
  options?: UseMutationOptions<void, Error, { ruleId: string; completed: boolean; notes?: string }>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.updateProgress(),
    mutationFn: async ({ ruleId, completed, notes }) => {
      const progress = await storage.loadProgress()
      const existingIndex = progress.findIndex(p => p.ruleId === ruleId)

      const newProgress: UserProgress = {
        ruleId,
        completed,
        completedAt: completed ? new Date() : undefined,
        notes
      }

      if (existingIndex >= 0) {
        progress[existingIndex] = newProgress
      } else {
        progress.push(newProgress)
      }

      await storage.saveProgress(progress)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress() })
    },
    ...options
  })
}

// Bulk update progress
/**
 * useBulkUpdateProgress function.
 * @param options? - options?.
 * @param Error - Error.
 * @param UserProgress[]> - UserProgress[]>.
 */
export function useBulkUpdateProgress(options?: UseMutationOptions<void, Error, UserProgress[]>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.bulkUpdateRules(),
    mutationFn: async updates => {
      const validUpdates = updates.filter(u => validateUserProgress(u).success)
      await storage.saveProgress(validUpdates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress() })
    },
    ...options
  })
}

// Toggle rule completion
/**
 * useToggleRule function.
 * @param options? - options?.
 * @param Error - Error.
 * @param string> - string>.
 */
export function useToggleRule(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.toggleRule(),
    mutationFn: async ruleId => {
      const progress = await storage.loadProgress()
      const existing = progress.find(p => p.ruleId === ruleId)

      if (existing) {
        existing.completed = !existing.completed
        existing.completedAt = existing.completed ? new Date() : undefined
      } else {
        progress.push({
          ruleId,
          completed: true,
          completedAt: new Date()
        })
      }

      await storage.saveProgress(progress)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress() })
    },
    ...options
  })
}

// Update preferences
/**
 * useUpdatePreferences function.
 */
export function useUpdatePreferences(
  options?: UseMutationOptions<void, Error, Partial<UserPreferences>>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.updatePreferences(),
    mutationFn: async updates => {
      const current = await storage.loadPreferences()
      const validation = validateUserPreferences({ ...current, ...updates })
      if (!validation.success) {
        throw new Error('Invalid preferences')
      }

      await storage.savePreferences(validation.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences() })
    },
    ...options
  })
}

// Import data
/**
 * useImportData function.
 * @param options? - options?.
 * @param Error - Error.
 * @param unknown> - unknown>.
 */
export function useImportData(options?: UseMutationOptions<void, Error, unknown>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.importData(),
    mutationFn: async data => {
      const validation = validateImportData(data)
      if (!validation.success) {
        throw new Error('Invalid import data format')
      }

      // Import progress
      if (validation.data.rules.length > 0) {
        const progress: UserProgress[] = validation.data.rules.map(rule => ({
          ruleId: rule.id,
          completed: rule.completed,
          completedAt: rule.completed ? new Date() : undefined,
          notes: rule.notes
        }))
        await storage.saveProgress(progress)
      }

      // Import preferences
      if (validation.data.preferences) {
        const prefValidation = validateUserPreferences(validation.data.preferences)
        if (prefValidation.success) {
          await storage.savePreferences(prefValidation.data)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.progress() })
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences() })
    },
    ...options
  })
}

// Clear all data
/**
 * useClearAllData function.
 * @param options? - options?.
 * @param Error - Error.
 * @param void> - void>.
 */
export function useClearAllData(options?: UseMutationOptions<void, Error, void>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await storage.clearAllData()
    },
    onSuccess: () => {
      queryClient.clear()
    },
    ...options
  })
}
