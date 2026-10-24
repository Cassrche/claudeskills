import { auth } from '@repo/auth/auth'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { shareChecklistForUser, unshareChecklistForUser } from '@/lib/server/checklist-service'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/**
 * POST: Enable sharing for a checklist; sets publicId and returns the share URL.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const publicId = await shareChecklistForUser(session.user.id, id)
    if (!publicId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistShared, {
      checklistId: id,
      publicId,
      userId: session.user.id
    })

    return NextResponse.json({ publicId })
  } catch (error) {
    captureServerException(error, { route: '/api/checklists/[id]/share' })
    return NextResponse.json({ error: 'Failed to share checklist' }, { status: 500 })
  }
}

/**
 * DELETE: Disable sharing; removes publicId.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const unshared = await unshareChecklistForUser(session.user.id, id)
    if (!unshared) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistUnshared, {
      checklistId: id,
      userId: session.user.id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    captureServerException(error, { route: '/api/checklists/[id]/share' })
    return NextResponse.json({ error: 'Failed to unshare checklist' }, { status: 500 })
  }
}
