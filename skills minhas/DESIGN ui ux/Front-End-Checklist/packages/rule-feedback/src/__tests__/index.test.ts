import type { RuleFeedbackRecord } from '@repo/types'
import {
  DEFAULT_RULE_FEEDBACK_POLICY,
  getCredibilityDecision,
  isFeedbackValue,
  summarizeRuleFeedback
} from '../index'

describe('@repo/rule-feedback', () => {
  it('accepts valid feedback values and rejects invalid ones', () => {
    expect(isFeedbackValue('helpful')).toBe(true)
    expect(isFeedbackValue('not_helpful')).toBe(true)
    expect(isFeedbackValue('upvote')).toBe(false)
    expect(isFeedbackValue(null)).toBe(false)
  })

  it('summarizes persisted feedback records', () => {
    const records: RuleFeedbackRecord[] = [
      {
        ruleId: 'rule-1',
        userId: 'user-1',
        value: 'helpful',
        createdAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z'
      },
      {
        ruleId: 'rule-1',
        userId: 'user-2',
        value: 'not_helpful',
        createdAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z'
      },
      {
        ruleId: 'rule-1',
        userId: 'user-3',
        value: 'helpful',
        createdAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z'
      }
    ]

    expect(summarizeRuleFeedback(records)).toEqual({
      totalResponses: 3,
      helpfulCount: 2,
      notHelpfulCount: 1,
      helpfulRatio: 2 / 3
    })
  })

  it('summarizes aggregate counts', () => {
    expect(summarizeRuleFeedback({ helpfulCount: 8, notHelpfulCount: 2 })).toEqual({
      totalResponses: 10,
      helpfulCount: 8,
      notHelpfulCount: 2,
      helpfulRatio: 0.8
    })
  })

  it('computes credibility decisions at policy boundaries', () => {
    expect(
      getCredibilityDecision(
        summarizeRuleFeedback({ helpfulCount: 19, notHelpfulCount: 5 }),
        DEFAULT_RULE_FEEDBACK_POLICY
      )
    ).toEqual({
      publicEligible: false,
      reason: 'insufficient_volume'
    })

    expect(
      getCredibilityDecision(
        summarizeRuleFeedback({ helpfulCount: 20, notHelpfulCount: 5 }),
        DEFAULT_RULE_FEEDBACK_POLICY
      )
    ).toEqual({
      publicEligible: false,
      reason: 'mixed_signal'
    })

    expect(
      getCredibilityDecision(
        summarizeRuleFeedback({ helpfulCount: 19, notHelpfulCount: 6 }),
        DEFAULT_RULE_FEEDBACK_POLICY
      )
    ).toEqual({
      publicEligible: false,
      reason: 'low_confidence'
    })

    expect(
      getCredibilityDecision(
        summarizeRuleFeedback({ helpfulCount: 21, notHelpfulCount: 4 }),
        DEFAULT_RULE_FEEDBACK_POLICY
      )
    ).toEqual({
      publicEligible: true,
      reason: 'eligible'
    })
  })
})
