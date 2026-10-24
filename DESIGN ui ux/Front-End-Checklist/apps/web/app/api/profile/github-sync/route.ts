import { auth } from '@repo/auth/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { GithubProfileSyncError } from '@/lib/server/github-profile-fetch'
import { syncGithubProfileForUser } from '@/lib/server/profile-service'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/**
 * Refresh the authenticated user's read-only GitHub profile metadata.
 */
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await syncGithubProfileForUser(session.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    trackServerEvent(TELEMETRY_EVENTS.profileGithubSynced, {
      userId: session.user.id
    })

    return NextResponse.json({ profile, syncedAt: new Date().toISOString() })
  } catch (error) {
    if (error instanceof GithubProfileSyncError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }

    captureServerException(error, { route: '/api/profile/github-sync' })
    return NextResponse.json({ error: 'Failed to sync GitHub profile' }, { status: 500 })
  }
}
