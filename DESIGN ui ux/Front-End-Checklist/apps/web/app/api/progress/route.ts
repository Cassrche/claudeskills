import { auth } from '@repo/auth/auth'
import { prisma } from '@repo/auth/prisma'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/**
 * Returns all rule progress for the signed-in user.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.ruleProgress.findMany({
    where: { userId: session.user.id }
  })

  const progress = rows.map(row => ({
    ruleId: row.ruleId,
    completed: row.completed,
    completedAt: row.completedAt?.toISOString(),
    notes: row.notes ?? undefined
  }))

  return NextResponse.json(progress)
}

/**
 * Upserts a single rule progress entry for the signed-in user.
 * Body: { ruleId: string, completed: boolean, completedAt?: string (ISO), notes?: string }
 */
export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: {
      ruleId?: string
      completed?: boolean
      completedAt?: string
      notes?: string
      eventType?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const ruleId = typeof body.ruleId === 'string' ? body.ruleId.trim() : ''
    if (!ruleId) {
      return NextResponse.json({ error: 'ruleId is required' }, { status: 400 })
    }

    const completed = Boolean(body.completed)
    const completedAt = body.completedAt
      ? new Date(body.completedAt)
      : completed
        ? new Date()
        : null
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : null

    await prisma.ruleProgress.upsert({
      where: {
        userId_ruleId: { userId: session.user.id, ruleId }
      },
      create: {
        userId: session.user.id,
        ruleId,
        completed,
        completedAt,
        notes
      },
      update: {
        completed,
        completedAt,
        notes
      }
    })

    const eventType = body.eventType === 'notes' ? 'notes' : 'completion'
    const event =
      eventType === 'notes'
        ? TELEMETRY_EVENTS.ruleNotesUpdated
        : completed
          ? TELEMETRY_EVENTS.ruleCompleted
          : TELEMETRY_EVENTS.ruleUncompleted

    trackServerEvent(event, {
      ruleId,
      userId: session.user.id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    captureServerException(error, { route: '/api/progress' })
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}

/**
 * Bulk sync progress (e.g. migration from localStorage).
 * Body: Array of { ruleId, completed, completedAt?, notes? }
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an array' }, { status: 400 })
    }

    const userId = session.user.id
    const valid = body.filter(
      (
        item
      ): item is {
        ruleId: string
        completed: boolean
        completedAt?: string
        notes?: string
      } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { ruleId?: unknown }).ruleId === 'string' &&
        typeof (item as { completed?: unknown }).completed === 'boolean'
    )

    await prisma.$transaction(
      valid.map(({ ruleId, completed, completedAt, notes }) =>
        prisma.ruleProgress.upsert({
          where: { userId_ruleId: { userId, ruleId } },
          create: {
            userId,
            ruleId,
            completed,
            completedAt: completedAt ? new Date(completedAt) : completed ? new Date() : null,
            notes: typeof notes === 'string' ? notes.slice(0, 1000) : null
          },
          update: {
            completed,
            completedAt: completedAt ? new Date(completedAt) : completed ? new Date() : null,
            notes: typeof notes === 'string' ? notes.slice(0, 1000) : null
          }
        })
      )
    )

    trackServerEvent(TELEMETRY_EVENTS.progressBulkSynced, {
      count: valid.length,
      userId
    })

    return NextResponse.json({ success: true, count: valid.length })
  } catch (error) {
    captureServerException(error, { route: '/api/progress' })
    return NextResponse.json({ error: 'Failed to sync progress' }, { status: 500 })
  }
}
