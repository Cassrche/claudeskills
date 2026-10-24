import type {
  RuleCredibilityDecision,
  RuleFeedbackRecord,
  RuleFeedbackSummary,
  RuleFeedbackValue
} from '@repo/types'

export interface RuleFeedbackPolicy {
  minResponses: number
  minHelpfulRatio: number
  maxNotHelpfulCount: number
}

export type RuleFeedbackAggregateInput =
  | RuleFeedbackRecord[]
  | {
      helpfulCount: number
      notHelpfulCount: number
    }

export const DEFAULT_RULE_FEEDBACK_POLICY: RuleFeedbackPolicy = {
  minResponses: 25,
  minHelpfulRatio: 0.8,
  maxNotHelpfulCount: 4
}

/**
 * Checks whether an unknown value is a supported rule feedback value.
 *
 * @param value - Unknown value to validate.
 * @returns True when the value matches a supported feedback action.
 */
export function isFeedbackValue(value: unknown): value is RuleFeedbackValue {
  return value === 'helpful' || value === 'not_helpful'
}

/** Clamps and floors a count to a non-negative integer. */
function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

/**
 * Summarizes raw feedback records or aggregate counts into the canonical-url shape.
 *
 * @param input - Either persisted feedback records or pre-counted aggregate totals.
 * @returns Normalized feedback summary for downstream use.
 */
export function summarizeRuleFeedback(input: RuleFeedbackAggregateInput): RuleFeedbackSummary {
  if (Array.isArray(input)) {
    const helpfulCount = input.filter(record => record.value === 'helpful').length
    const notHelpfulCount = input.filter(record => record.value === 'not_helpful').length
    const totalResponses = helpfulCount + notHelpfulCount

    return {
      totalResponses,
      helpfulCount,
      notHelpfulCount,
      helpfulRatio: totalResponses === 0 ? 0 : helpfulCount / totalResponses
    }
  }

  const helpfulCount = normalizeCount(input.helpfulCount)
  const notHelpfulCount = normalizeCount(input.notHelpfulCount)
  const totalResponses = helpfulCount + notHelpfulCount

  return {
    totalResponses,
    helpfulCount,
    notHelpfulCount,
    helpfulRatio: totalResponses === 0 ? 0 : helpfulCount / totalResponses
  }
}

/**
 * Determines whether a rule has enough reliable signal to support a future
 * public credibility indicator.
 *
 * @param summary - Aggregated rule feedback metrics.
 * @param policy - Threshold policy for public-signal eligibility.
 * @returns Credibility decision and reason code.
 */
export function getCredibilityDecision(
  summary: RuleFeedbackSummary,
  policy: RuleFeedbackPolicy = DEFAULT_RULE_FEEDBACK_POLICY
): RuleCredibilityDecision {
  if (summary.totalResponses < policy.minResponses) {
    return {
      publicEligible: false,
      reason: 'insufficient_volume'
    }
  }

  if (summary.helpfulRatio < policy.minHelpfulRatio) {
    return {
      publicEligible: false,
      reason: 'low_confidence'
    }
  }

  if (summary.notHelpfulCount > policy.maxNotHelpfulCount) {
    return {
      publicEligible: false,
      reason: 'mixed_signal'
    }
  }

  return {
    publicEligible: true,
    reason: 'eligible'
  }
}
