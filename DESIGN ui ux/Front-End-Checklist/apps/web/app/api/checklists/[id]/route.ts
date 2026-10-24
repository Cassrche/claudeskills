import { auth } from '@repo/auth/auth'
import type { ChecklistFramework } from '@repo/types'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { rejectIfBot } from '@/lib/bot-protection'
import {
  deleteChecklistForUser,
  parseChecklistFramework,
  updateChecklistForUser
} from '@/lib/server/checklist-service'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/**
 * Updates a persisted checklist owned by the signed-in user.
 * @param _request - Incoming request containing the checklist updates.
 * @param context - Route params containing the checklist identifier.
 * @returns A JSON response containing the updated checklist or an error.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const botResponse = await rejectIfBot()
    if (botResponse) return botResponse

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const request = await _request.json()
    const updates: {
      name?: string
      description?: string | null
      framework?: ChecklistFramework | null
      color?: string | null
      ruleIds?: string[]
    } = {}
    if (typeof request.name === 'string') updates.name = request.name.trim()
    if (typeof request.description === 'string')
      updates.description = request.description.trim() || null
    const framework = parseChecklistFramework(request.framework)
    if (framework !== undefined) updates.framework = framework
    if (typeof request.color === 'string') updates.color = request.color.trim() || null
    if (Array.isArray(request.ruleIds)) updates.ruleIds = request.ruleIds

    const updated = await updateChecklistForUser(session.user.id, id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistUpdated, {
      checklistId: updated.id,
      updatedFields: Object.keys(updates),
      userId: session.user.id
    })

    return NextResponse.json(updated)
  } catch (error) {
    captureServerException(error, { route: '/api/checklists/[id]' })
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
  }
}

/**
 * Deletes a persisted checklist owned by the signed-in user.
 * @param _request - Incoming request metadata.
 * @param context - Route params containing the checklist identifier.
 * @returns An empty response on success or an error payload.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const botResponse = await rejectIfBot()
    if (botResponse) return botResponse

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const deleted = await deleteChecklistForUser(session.user.id, id)
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistDeleted, {
      checklistId: id,
      userId: session.user.id
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    captureServerException(error, { route: '/api/checklists/[id]' })
    return NextResponse.json({ error: 'Failed to delete checklist' }, { status: 500 })
  }
}
