'use client'

import type {
  RuleCredibilityDecision,
  RuleFeedbackMutationInput,
  RuleFeedbackResponse,
  RuleFeedbackSummary,
  RuleFeedbackValue
} from '@repo/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

/**
 * Type guard for plain objects.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Type guard for RuleFeedbackSummary. */
function isRuleFeedbackSummary(value: unknown): value is RuleFeedbackSummary {
  return (
    isRecord(value) &&
    typeof value.totalResponses === 'number' &&
    typeof value.helpfulCount === 'number' &&
    typeof value.notHelpfulCount === 'number' &&
    typeof value.helpfulRatio === 'number'
  )
}

/** Type guard for RuleCredibilityDecision. */
function isRuleCredibilityDecision(value: unknown): value is RuleCredibilityDecision {
  return (
    isRecord(value) && typeof value.publicEligible === 'boolean' && typeof value.reason === 'string'
  )
}

/** Type guard for RuleFeedbackValue. */
function isRuleFeedbackValue(value: unknown): value is RuleFeedbackValue {
  return value === 'helpful' || value === 'not_helpful'
}

/** Type guard for RuleFeedbackResponse. */
function isRuleFeedbackResponse(value: unknown): value is RuleFeedbackResponse {
  return (
    isRecord(value) &&
    (value.currentUserFeedback === null || isRuleFeedbackValue(value.currentUserFeedback)) &&
    isRuleFeedbackSummary(value.summary) &&
    isRuleCredibilityDecision(value.credibility)
  )
}

/** Parses and validates API response into RuleFeedbackResponse. */
function parseRuleFeedbackResponse(value: unknown): RuleFeedbackResponse {
  if (!isRuleFeedbackResponse(value)) {
    throw new Error('Invalid rule feedback payload')
  }

  return value
}

/** Applies optimistic update for a new feedback value. */
function applyOptimisticFeedback(
  previous: RuleFeedbackResponse | undefined,
  nextValue: RuleFeedbackValue
): RuleFeedbackResponse | undefined {
  if (!previous) return previous

  let helpfulCount = previous.summary.helpfulCount
  let notHelpfulCount = previous.summary.notHelpfulCount

  if (previous.currentUserFeedback === 'helpful') {
    helpfulCount = Math.max(0, helpfulCount - 1)
  }

  if (previous.currentUserFeedback === 'not_helpful') {
    notHelpfulCount = Math.max(0, notHelpfulCount - 1)
  }

  if (nextValue === 'helpful') {
    helpfulCount += 1
  } else {
    notHelpfulCount += 1
  }

  const totalResponses = helpfulCount + notHelpfulCount

  return {
    ...previous,
    currentUserFeedback: nextValue,
    summary: {
      totalResponses,
      helpfulCount,
      notHelpfulCount,
      helpfulRatio: totalResponses === 0 ? 0 : helpfulCount / totalResponses
    }
  }
}

/** Fetches rule feedback from the API. */
async function fetchRuleFeedback(ruleId: string): Promise<RuleFeedbackResponse> {
  const response = await fetch(`/api/rules/${ruleId}/feedback`)
  if (!response.ok) {
    throw new Error('Failed to fetch rule feedback')
  }

  return parseRuleFeedbackResponse(await response.json())
}

/** Submits feedback for a rule via the API. */
async function updateRuleFeedback(
  ruleId: string,
  payload: RuleFeedbackMutationInput
): Promise<RuleFeedbackResponse> {
  const response = await fetch(`/api/rules/${ruleId}/feedback`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error('Failed to update rule feedback')
  }

  return parseRuleFeedbackResponse(await response.json())
}

/** Hook for reading and submitting rule feedback (helpful / not helpful). */
export function useRuleFeedback(ruleId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['rule-feedback', ruleId] as const
  const isClient = typeof window !== 'undefined'

  const query = useQuery({
    queryKey,
    queryFn: () => fetchRuleFeedback(ruleId),
    staleTime: 1000 * 60 * 2,
    enabled: isClient
  })

  const mutation = useMutation({
    mutationFn: (value: RuleFeedbackValue) => updateRuleFeedback(ruleId, { value }),
    onMutate: async value => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<RuleFeedbackResponse>(queryKey)
      const optimistic = applyOptimisticFeedback(previous, value)

      if (optimistic) {
        queryClient.setQueryData(queryKey, optimistic)
      }

      return { previous }
    },
    onError: (_error, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSuccess: data => {
      queryClient.setQueryData(queryKey, data)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    }
  })

  const setFeedback = useCallback(
    (value: RuleFeedbackValue) => {
      mutation.mutate(value)
    },
    [mutation]
  )

  return {
    currentUserFeedback: query.data?.currentUserFeedback ?? null,
    summary: query.data?.summary,
    credibility: query.data?.credibility,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    setFeedback
  }
}
