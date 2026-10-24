import type { Prisma } from '@prisma/client'
import { auth } from '@repo/auth/auth'
import { prisma } from '@repo/auth/prisma'
import { getCredibilityDecision, isFeedbackValue, summarizeRuleFeedback } from '@repo/rule-feedback'
import type { RuleFeedbackResponse, RuleFeedbackValue } from '@repo/types'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rejectIfBot } from '@/lib/bot-protection'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

type RuleFeedbackDelegate = {
  groupBy: typeof prisma.ruleFeedback.groupBy
  findUnique: typeof prisma.ruleFeedback.findUnique
  upsert: typeof prisma.ruleFeedback.upsert
}

/**
 * Build the empty feedback payload used when the table is unavailable.
 */
function emptyRuleFeedbackResponse(): RuleFeedbackResponse {
  const summary = summarizeRuleFeedback({ helpfulCount: 0, notHelpfulCount: 0 })

  return {
    currentUserFeedback: null,
    summary,
    credibility: getCredibilityDecision(summary)
  }
}

/**
 * Detect the Prisma error raised when the RuleFeedback table does not exist yet.
 *
 * @param error - Unknown caught error.
 * @returns True when the error is Prisma's missing-table code.
 */
function isMissingRuleFeedbackTableError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2021'
}

/**
 * Check whether the RuleFeedback table exists in the current database schema.
 */
async function ruleFeedbackTableExists(): Promise<boolean> {
  if (!getRuleFeedbackDelegate()) {
    return false
  }

  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'RuleFeedback'
    ) AS "exists"
  `

  return result[0]?.exists === true
}

/**
 * Check whether an arbitrary Prisma delegate has the methods needed for feedback queries.
 *
 * @param value - Unknown delegate value.
 * @returns True when the value looks like the rule feedback delegate.
 */
function isRuleFeedbackDelegate(value: unknown): value is RuleFeedbackDelegate {
  return (
    typeof value === 'object' &&
    value !== null &&
    'groupBy' in value &&
    typeof value.groupBy === 'function' &&
    'findUnique' in value &&
    typeof value.findUnique === 'function' &&
    'upsert' in value &&
    typeof value.upsert === 'function'
  )
}

/**
 * Read the Prisma delegate safely so tests can run before the table exists.
 */
function getRuleFeedbackDelegate(): RuleFeedbackDelegate | null {
  const delegate = Reflect.get(prisma, 'ruleFeedback')

  if (!isRuleFeedbackDelegate(delegate)) {
    return null
  }

  return delegate
}

/**
 * Builds the rule feedback response (counts, summary, credibility, current user vote) for a rule.
 */
async function buildRuleFeedbackResponse(
  ruleId: string,
  userId?: string
): Promise<RuleFeedbackResponse> {
  const ruleFeedback = getRuleFeedbackDelegate()
  if (!ruleFeedback || !(await ruleFeedbackTableExists())) {
    return emptyRuleFeedbackResponse()
  }

  try {
    const grouped = await ruleFeedback.groupBy({
      by: ['value'],
      where: { ruleId },
      _count: { value: true }
    })

    const counts = grouped.reduce(
      (acc, group) => {
        if (group.value === 'helpful') {
          acc.helpfulCount = group._count.value
        }

        if (group.value === 'not_helpful') {
          acc.notHelpfulCount = group._count.value
        }

        return acc
      },
      { helpfulCount: 0, notHelpfulCount: 0 }
    )

    const summary = summarizeRuleFeedback(counts)
    const currentUserFeedback = userId
      ? await ruleFeedback.findUnique({
          where: {
            userId_ruleId: {
              userId,
              ruleId
            }
          },
          select: { value: true }
        })
      : null

    return {
      currentUserFeedback:
        currentUserFeedback && isFeedbackValue(currentUserFeedback.value)
          ? currentUserFeedback.value
          : null,
      summary,
      credibility: getCredibilityDecision(summary)
    }
  } catch (error) {
    if (isMissingRuleFeedbackTableError(error)) {
      return emptyRuleFeedbackResponse()
    }

    throw error
  }
}

/**
 * Returns the current user's feedback state and internal aggregate signal for a rule.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  const { ruleId } = await params

  return NextResponse.json(await buildRuleFeedbackResponse(ruleId, session?.user?.id))
}

/**
 * Upserts feedback for a signed-in user on a rule.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const botResponse = await rejectIfBot()
    if (botResponse) return botResponse

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const value: unknown = body?.value

    if (!isFeedbackValue(value)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
    }

    const { ruleId } = await params

    const ruleFeedback = getRuleFeedbackDelegate()
    if (!ruleFeedback || !(await ruleFeedbackTableExists())) {
      return NextResponse.json(emptyRuleFeedbackResponse())
    }

    await ruleFeedback.upsert({
      where: {
        userId_ruleId: {
          userId: session.user.id,
          ruleId
        }
      },
      update: {
        value
      },
      create: {
        userId: session.user.id,
        ruleId,
        value
      }
    })

    trackServerEvent(TELEMETRY_EVENTS.ruleFeedbackSubmitted, {
      ruleId,
      userId: session.user.id,
      value
    })

    return NextResponse.json(await buildRuleFeedbackResponse(ruleId, session.user.id))
  } catch (error) {
    if (isMissingRuleFeedbackTableError(error)) {
      return NextResponse.json(emptyRuleFeedbackResponse())
    }

    captureServerException(error, { route: '/api/rules/[ruleId]/feedback' })
    return NextResponse.json({ error: 'Failed to update rule feedback' }, { status: 500 })
  }
}

export type { RuleFeedbackValue }
