import { auth } from '@repo/auth/auth'
import { prisma } from '@repo/auth/prisma'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackServerEvent } from '@/lib/telemetry-server'

/**
 * Permanently deletes the authenticated user's account and all associated data.
 * Cascading deletes handle related records (progress, checklists, sessions, etc.).
 */
export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  await prisma.user.delete({ where: { id: userId } })
  trackServerEvent(TELEMETRY_EVENTS.accountDeleted, { userId })

  return NextResponse.json({ success: true })
}
