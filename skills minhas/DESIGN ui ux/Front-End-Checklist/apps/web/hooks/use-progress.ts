'use client'

import { authClient } from '@repo/auth/auth-client'
import { storage } from '@repo/storage'
import type { UserProgress } from '@repo/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { trackClientEvent } from '@/lib/telemetry-client'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'

const MIGRATION_KEY_PREFIX = 'fec_progress_migrated_'

/**
 * Convert API progress records into the shared client progress shape.
 *
 * @param items - Raw progress items returned by the API.
 * @returns Normalized progress records with Date instances.
 */
function parseProgressFromApi(
  items: { ruleId: string; completed: boolean; completedAt?: string; notes?: string }[]
): UserProgress[] {
  return items.map(p => ({
    ruleId: p.ruleId,
    completed: p.completed,
    completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
    notes: p.notes
  }))
}

/**
 * Load progress records for the current signed-in user from the API.
 *
 * @returns Normalized progress records, or an empty list on failure.
 */
async function fetchProgressFromApi(): Promise<UserProgress[]> {
  const res = await fetch('/api/progress')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? parseProgressFromApi(data) : []
}

/**
 * Upsert a single progress record into the current collection.
 *
 * @param current - Existing progress collection.
 * @param next - Progress record to insert or replace.
 * @returns Updated progress collection.
 */
function upsertProgressItem(current: UserProgress[], next: UserProgress): UserProgress[] {
  if (current.some(item => item.ruleId === next.ruleId)) {
    return current.map(item => (item.ruleId === next.ruleId ? { ...item, ...next } : item))
  }

  return [...current, next]
}

/** Provides rule completion tracking: toggle, stats, import/export, and bulk operations. */
export function useProgress() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const isSignedIn = Boolean(session?.user?.id)
  const migrationDoneRef = useRef(false)

  const queryKey = isSignedIn ? ['progress', session!.user.id] : ['progress']

  const { data: progress = [], isLoading } = useQuery({
    queryKey,
    queryFn: isSignedIn ? fetchProgressFromApi : () => storage.loadProgress(),
    enabled: true,
    staleTime: isSignedIn ? 1000 * 60 * 2 : 1000 * 60 * 5
  })

  // On first sign-in, migrate localStorage progress to API once
  useEffect(() => {
    if (!isSignedIn || !session?.user?.id || migrationDoneRef.current) return

    const migratedKey = MIGRATION_KEY_PREFIX + session.user.id
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(migratedKey)) {
      migrationDoneRef.current = true
      return
    }

    migrationDoneRef.current = true

    storage.loadProgress().then(localProgress => {
      if (localProgress.length === 0) {
        sessionStorage.setItem(migratedKey, '1')
        return
      }

      const body = localProgress.map(p => ({
        ruleId: p.ruleId,
        completed: p.completed,
        completedAt: p.completedAt?.toISOString(),
        notes: p.notes
      }))

      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(res => {
          if (res.ok) {
            storage.saveProgress([])
            sessionStorage.setItem(migratedKey, '1')
            queryClient.invalidateQueries({ queryKey })
          }
        })
        .catch(() => {
          migrationDoneRef.current = false
        })
    })
  }, [isSignedIn, session?.user?.id, queryKey, queryClient])

  const saveProgressMutation = useMutation({
    mutationFn: async (newProgress: UserProgress[]) => {
      if (isSignedIn) {
        const body = newProgress.map(p => ({
          ruleId: p.ruleId,
          completed: p.completed,
          completedAt: p.completedAt?.toISOString(),
          notes: p.notes
        }))
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) throw new Error('Failed to save progress')
      } else {
        await storage.saveProgress(newProgress)
      }
    },
    onMutate: async newProgress => {
      await queryClient.cancelQueries({ queryKey })
      const previousProgress = queryClient.getQueryData<UserProgress[]>(queryKey) ?? progress
      queryClient.setQueryData(queryKey, newProgress)
      return { previousProgress }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKey, context.previousProgress)
      }
    }
  })

  const putProgressMutation = useMutation({
    mutationFn: async (payload: {
      ruleId: string
      completed: boolean
      completedAt?: Date
      notes?: string
      eventType?: 'completion' | 'notes'
    }) => {
      const res = await fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: payload.ruleId,
          completed: payload.completed,
          completedAt: payload.completedAt?.toISOString(),
          notes: payload.notes,
          eventType: payload.eventType
        })
      })
      if (!res.ok) throw new Error('Failed to update progress')
    },
    onMutate: async payload => {
      await queryClient.cancelQueries({ queryKey })
      const previousProgress = queryClient.getQueryData<UserProgress[]>(queryKey) ?? progress
      const nextProgress = upsertProgressItem(previousProgress, {
        ruleId: payload.ruleId,
        completed: payload.completed,
        completedAt: payload.completedAt,
        notes: payload.notes
      })
      queryClient.setQueryData(queryKey, nextProgress)
      return { previousProgress }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKey, context.previousProgress)
      }
    }
  })

  const toggleRuleCompletion = useCallback(
    (ruleId: string) => {
      const existingProgress = progress.find(p => p.ruleId === ruleId)
      const nextCompleted = existingProgress ? !existingProgress.completed : true
      const completedAt = nextCompleted ? new Date() : undefined

      if (isSignedIn) {
        putProgressMutation.mutate({
          ruleId,
          completed: nextCompleted,
          completedAt,
          eventType: 'completion'
        })
      } else {
        let newProgress: UserProgress[]
        if (existingProgress) {
          newProgress = progress.map(p =>
            p.ruleId === ruleId ? { ...p, completed: nextCompleted, completedAt } : p
          )
        } else {
          newProgress = [...progress, { ruleId, completed: nextCompleted, completedAt }]
        }

        saveProgressMutation.mutate(newProgress)
        trackClientEvent(
          nextCompleted ? TELEMETRY_EVENTS.ruleCompleted : TELEMETRY_EVENTS.ruleUncompleted,
          {
            ruleId,
            sessionState: 'signed_out'
          }
        )
      }
    },
    [progress, isSignedIn, queryKey, queryClient, putProgressMutation, saveProgressMutation]
  )

  const updateRuleNotes = useCallback(
    (ruleId: string, notes: string) => {
      const existingProgress = progress.find(p => p.ruleId === ruleId)
      const completed = existingProgress?.completed ?? false
      const completedAt = existingProgress?.completedAt

      if (isSignedIn) {
        putProgressMutation.mutate({ ruleId, completed, completedAt, notes, eventType: 'notes' })
      } else {
        let newProgress: UserProgress[]
        if (existingProgress) {
          newProgress = progress.map(p => (p.ruleId === ruleId ? { ...p, notes } : p))
        } else {
          newProgress = [...progress, { ruleId, completed: false, notes }]
        }
        saveProgressMutation.mutate(newProgress)
        trackClientEvent(TELEMETRY_EVENTS.ruleNotesUpdated, {
          ruleId,
          sessionState: 'signed_out'
        })
      }
    },
    [progress, isSignedIn, queryKey, queryClient, putProgressMutation, saveProgressMutation]
  )

  const getRuleProgress = useCallback(
    (ruleId: string): UserProgress | undefined => {
      return progress.find(p => p.ruleId === ruleId)
    },
    [progress]
  )

  const isRuleCompleted = useCallback(
    (ruleId: string): boolean => {
      const ruleProgress = progress.find(p => p.ruleId === ruleId)
      return ruleProgress?.completed || false
    },
    [progress]
  )

  const getCompletionStats = useCallback(
    (ruleIds?: string[]) => {
      const relevantRules = ruleIds || []
      const completedRules = progress.filter(
        p => p.completed && (ruleIds ? relevantRules.includes(p.ruleId) : true)
      )

      const total = ruleIds ? ruleIds.length : completedRules.length
      const completed = completedRules.length
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

      return {
        total,
        completed,
        percentage,
        remaining: total - completed
      }
    },
    [progress]
  )

  const getCategoryStats = useCallback(
    (categoryRules: { id: string; primaryCategory: string }[]) => {
      const categories = new Map<string, { total: number; completed: number }>()

      categoryRules.forEach(rule => {
        const category = rule.primaryCategory
        const isCompleted = isRuleCompleted(rule.id)

        if (!categories.has(category)) {
          categories.set(category, { total: 0, completed: 0 })
        }

        const stats = categories.get(category)!
        stats.total++
        if (isCompleted) {
          stats.completed++
        }
      })

      return Array.from(categories.entries()).map(([category, stats]) => ({
        category,
        ...stats,
        percentage: Math.round((stats.completed / stats.total) * 100)
      }))
    },
    [isRuleCompleted]
  )

  const clearAllProgress = useCallback(() => {
    saveProgressMutation.mutate([])
  }, [saveProgressMutation])

  const resetRulesProgress = useCallback(
    (ruleIds: string[]) => {
      const ruleIdSet = new Set(ruleIds)
      const newProgress = progress.map(p =>
        ruleIdSet.has(p.ruleId) ? { ...p, completed: false, completedAt: undefined } : p
      )
      saveProgressMutation.mutate(newProgress)
    },
    [progress, saveProgressMutation]
  )

  const markRulesComplete = useCallback(
    (ruleIds: string[]) => {
      const ruleIdSet = new Set(ruleIds)
      const existingRuleIds = new Set(progress.map(p => p.ruleId))
      const now = new Date()

      const updatedProgress = progress.map(p =>
        ruleIdSet.has(p.ruleId) ? { ...p, completed: true, completedAt: now } : p
      )

      const newEntries: UserProgress[] = ruleIds
        .filter(id => !existingRuleIds.has(id))
        .map(ruleId => ({
          ruleId,
          completed: true,
          completedAt: now
        }))

      saveProgressMutation.mutate([...updatedProgress, ...newEntries])
    },
    [progress, saveProgressMutation]
  )

  const exportProgress = useCallback(async () => {
    const data = await storage.exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frontend-checklist-progress-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const isSaving = saveProgressMutation.isPending || putProgressMutation.isPending
  const saveError = saveProgressMutation.error ?? putProgressMutation.error

  return {
    progress,
    isLoading,

    toggleRuleCompletion,
    updateRuleNotes,
    clearAllProgress,
    resetRulesProgress,
    markRulesComplete,
    exportProgress,

    getRuleProgress,
    isRuleCompleted,
    getCompletionStats,
    getCategoryStats,

    isSaving,
    saveError
  }
}

/** Provides completion state and actions for a single rule. */
export function useRuleProgress(ruleId: string) {
  const { getRuleProgress, isRuleCompleted, toggleRuleCompletion, updateRuleNotes, isSaving } =
    useProgress()

  const ruleProgress = getRuleProgress(ruleId)
  const isCompleted = isRuleCompleted(ruleId)

  return {
    progress: ruleProgress,
    isCompleted,
    notes: ruleProgress?.notes || '',
    completedAt: ruleProgress?.completedAt,
    toggleCompletion: () => toggleRuleCompletion(ruleId),
    updateNotes: (notes: string) => updateRuleNotes(ruleId, notes),
    isSaving
  }
}
