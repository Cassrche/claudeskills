import { auth } from '@repo/auth/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { rejectIfBot } from '@/lib/bot-protection'
import {
  createChecklistForUser,
  listChecklistsForUser,
  parseChecklistFramework
} from '@/lib/server/checklist-service'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/**
 * Returns all persisted checklists for the signed-in user.
 * @returns A JSON response containing the current user's checklists.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(await listChecklistsForUser(session.user.id))
}

/**
 * Creates a persisted checklist for the signed-in user.
 * @param request - Incoming request containing the checklist payload.
 * @returns A JSON response containing the created checklist or an error.
 */
export async function POST(request: Request) {
  try {
    const botResponse = await rejectIfBot()
    if (botResponse) return botResponse

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    const framework = parseChecklistFramework(body.framework)
    const ruleIds = Array.isArray(body.ruleIds)
      ? body.ruleIds.filter((r: unknown): r is string => typeof r === 'string')
      : []

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const checklist = await createChecklistForUser(session.user.id, {
      name,
      description,
      framework: framework ?? undefined,
      ruleIds
    })

    trackServerEvent(TELEMETRY_EVENTS.checklistCreated, {
      checklistId: checklist.id,
      ruleCount: checklist.ruleIds.length,
      userId: session.user.id
    })

    return NextResponse.json(checklist)
  } catch (error) {
    captureServerException(error, { route: '/api/checklists' })
    return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 })
  }
}
