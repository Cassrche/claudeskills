'use client'

import { authClient } from '@repo/auth/auth-client'
import { isChecklistFramework } from '@repo/config'
import type { ChecklistFramework, UserChecklist } from '@repo/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAction } from 'next-safe-action/hooks'
import { useCallback } from 'react'
import {
  createChecklistAction,
  deleteChecklistAction,
  shareChecklistAction,
  unshareChecklistAction,
  updateChecklistAction
} from '@/actions/checklist-actions'
import { getSafeActionErrorMessage } from '@/lib/safe-action-result'
import { useProgress } from './use-progress'

/**
 * Checks whether a value is a plain object that can be inspected safely.
 * @param value - Unknown value to validate.
 * @returns True when the value is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Checks whether a value is an array of strings.
 * @param value - Unknown value to validate.
 * @returns True when every array item is a string.
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

/**
 * Validates an unknown payload as a user checklist.
 * @param value - Unknown payload received from the API.
 * @returns True when the payload matches the user checklist shape.
 */
function isUserChecklist(value: unknown): value is UserChecklist {
  if (!isRecord(value)) return false

  const description = value.description
  const color = value.color
  const framework = value.framework

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isStringArray(value.ruleIds) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (description === undefined || typeof description === 'string') &&
    (framework === undefined || isChecklistFramework(framework)) &&
    (color === undefined || typeof color === 'string')
  )
}

/**
 * Parses an unknown payload into a validated user checklist.
 * @param value - Unknown payload received from the API.
 * @returns A validated user checklist.
 */
function parseUserChecklist(value: unknown): UserChecklist {
  if (!isUserChecklist(value)) {
    throw new Error('Invalid checklist payload')
  }

  return value
}

/**
 * Fetches server-backed checklists for the authenticated user.
 * @returns The validated checklist collection from the API.
 */
async function fetchChecklistsFromApi(): Promise<UserChecklist[]> {
  const res = await fetch('/api/checklists')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data.filter(isUserChecklist) : []
}

/**
 * Hook for managing user-created checklists.
 * Requires sign-in; when not signed in returns empty checklists and no-ops mutations.
 */
export function useUserChecklists() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { getCompletionStats } = useProgress()
  const isSignedIn = Boolean(session?.user?.id)

  const queryKey = ['user-checklists', session?.user?.id]

  const { data: checklists = [], isLoading } = useQuery({
    queryKey,
    queryFn: fetchChecklistsFromApi,
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 2
  })

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const { executeAsync: executeCreateChecklist, isPending: isCreatingChecklist } =
    useAction(createChecklistAction)
  const { executeAsync: executeUpdateChecklist, isPending: isUpdatingChecklist } =
    useAction(updateChecklistAction)
  const { executeAsync: executeDeleteChecklist, isPending: isDeletingChecklist } =
    useAction(deleteChecklistAction)
  const { executeAsync: executeShareChecklist, isPending: isSharingChecklist } =
    useAction(shareChecklistAction)
  const { executeAsync: executeUnshareChecklist, isPending: isUnsharingChecklist } =
    useAction(unshareChecklistAction)

  const createChecklist = useCallback(
    async (
      name: string,
      description?: string,
      ruleIds?: string[],
      framework?: ChecklistFramework
    ) => {
      const payload = {
        name: name.trim(),
        description: description?.trim(),
        framework,
        ruleIds: ruleIds ?? []
      }
      const result = await executeCreateChecklist({
        name: payload.name,
        description: payload.description,
        framework: payload.framework,
        ruleIds: payload.ruleIds
      })
      if (!result.data) {
        throw new Error(getSafeActionErrorMessage(result, 'Failed to create checklist'))
      }

      await invalidate()
      const checklist = parseUserChecklist(result.data)
      return checklist
    },
    [executeCreateChecklist, invalidate]
  )

  const runUpdateChecklist = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<UserChecklist, 'name' | 'description' | 'framework' | 'color' | 'ruleIds'>
      >
    ) => {
      const result = await executeUpdateChecklist({ id, ...updates })
      if (!result.data) {
        throw new Error(getSafeActionErrorMessage(result, 'Failed to update checklist'))
      }

      await invalidate()

      return parseUserChecklist(result.data)
    },
    [executeUpdateChecklist, invalidate]
  )

  const updateChecklist = useCallback(
    (
      id: string,
      updates: Partial<Pick<UserChecklist, 'name' | 'description' | 'framework' | 'color'>>
    ) => {
      void runUpdateChecklist(id, updates).catch(() => {})
    },
    [runUpdateChecklist]
  )

  const deleteChecklist = useCallback(
    (id: string) => {
      void (async () => {
        const result = await executeDeleteChecklist({ id })
        if (!result.data) {
          throw new Error(getSafeActionErrorMessage(result, 'Failed to delete checklist'))
        }

        await invalidate()
      })().catch(() => {})
    },
    [executeDeleteChecklist, invalidate]
  )

  const addRule = useCallback(
    (checklistId: string, ruleId: string) => {
      const checklist = checklists.find(c => c.id === checklistId)
      if (!checklist || checklist.ruleIds.includes(ruleId)) return
      const ruleIds = [...checklist.ruleIds, ruleId]
      if (!isSignedIn) return
      void runUpdateChecklist(checklistId, { ruleIds }).catch(() => {})
    },
    [checklists, isSignedIn, runUpdateChecklist]
  )

  const removeRule = useCallback(
    (checklistId: string, ruleId: string) => {
      const checklist = checklists.find(c => c.id === checklistId)
      if (!checklist) return
      const ruleIds = checklist.ruleIds.filter(id => id !== ruleId)
      if (!isSignedIn) return
      void runUpdateChecklist(checklistId, { ruleIds }).catch(() => {})
    },
    [checklists, isSignedIn, runUpdateChecklist]
  )

  const isRuleInChecklist = useCallback(
    (checklistId: string, ruleId: string) => {
      const c = checklists.find(x => x.id === checklistId)
      return c?.ruleIds.includes(ruleId) ?? false
    },
    [checklists]
  )

  const getChecklistsForRule = useCallback(
    (ruleId: string) => checklists.filter(c => c.ruleIds.includes(ruleId)),
    [checklists]
  )

  const getChecklist = useCallback((id: string) => checklists.find(c => c.id === id), [checklists])

  const getChecklistProgress = useCallback(
    (id: string) => {
      const c = checklists.find(x => x.id === id)
      return c
        ? getCompletionStats(c.ruleIds)
        : { total: 0, completed: 0, percentage: 0, remaining: 0 }
    },
    [checklists, getCompletionStats]
  )

  const duplicateChecklist = useCallback(
    (id: string) => {
      const original = checklists.find(c => c.id === id)
      if (!original || !isSignedIn) return null
      void createChecklist(
        `${original.name} (copy)`,
        original.description,
        [...original.ruleIds],
        original.framework
      ).catch(() => {})
      return null
    },
    [checklists, createChecklist, isSignedIn]
  )

  const exportChecklist = useCallback(
    (id: string) => {
      const c = checklists.find(x => x.id === id)
      if (!c) return
      const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `checklist-${c.name.toLowerCase().replace(/\s+/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [checklists]
  )

  const importChecklist = useCallback(
    (jsonData: string) => {
      try {
        const imported = JSON.parse(jsonData)
        if (!isRecord(imported)) throw new Error('Invalid format')
        if (typeof imported.name !== 'string' || !isStringArray(imported.ruleIds)) {
          throw new Error('Invalid format')
        }
        if (!isSignedIn) return null
        void createChecklist(
          imported.name,
          typeof imported.description === 'string' ? imported.description : undefined,
          imported.ruleIds,
          isChecklistFramework(imported.framework) ? imported.framework : undefined
        ).catch(() => {})
        return null
      } catch {
        return null
      }
    },
    [createChecklist, isSignedIn]
  )

  const clearAllChecklists = useCallback(() => {
    if (!isSignedIn) return
    checklists.forEach(checklist => {
      deleteChecklist(checklist.id)
    })
  }, [checklists, deleteChecklist, isSignedIn])

  const enableShare = useCallback(
    (id: string) => {
      if (!isSignedIn) return
      void (async () => {
        const result = await executeShareChecklist({ id })
        if (!result.data) {
          throw new Error(getSafeActionErrorMessage(result, 'Failed to share checklist'))
        }

        await invalidate()
      })().catch(() => {})
    },
    [executeShareChecklist, invalidate, isSignedIn]
  )

  const disableShare = useCallback(
    (id: string) => {
      if (!isSignedIn) return
      void (async () => {
        const result = await executeUnshareChecklist({ id })
        if (!result.data) {
          throw new Error(getSafeActionErrorMessage(result, 'Failed to unshare checklist'))
        }

        await invalidate()
      })().catch(() => {})
    },
    [executeUnshareChecklist, invalidate, isSignedIn]
  )

  return {
    checklists,
    isLoading,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    duplicateChecklist,
    getChecklist,
    addRule,
    removeRule,
    isRuleInChecklist,
    getChecklistsForRule,
    getChecklistProgress,
    exportChecklist,
    importChecklist,
    clearAllChecklists,
    enableShare,
    disableShare,
    isSaving: isCreatingChecklist || isUpdatingChecklist || isDeletingChecklist,
    saveError: null,
    isShareLoading: isSharingChecklist || isUnsharingChecklist
  }
}
