import { auth } from '@repo/auth/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getProfileForUser, updateProfileForUser } from '@/lib/server/profile-service'
import { InvalidSocialLinkError, normalizeOptionalSocialProfileUrl } from '@/lib/social-links'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/**
 * Updates the authenticated user's profile fields.
 * Username: 3-30 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphens.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getProfileForUser(session.user.id)
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

/**
 * Updates the authenticated user's profile fields (headline, bio, social links, visibility).
 * Username is read-only and derived from GitHub sign-in.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const updates: {
      headline?: string | null
      bio?: string | null
      githubUrl?: string | null
      xUrl?: string | null
      linkedinUrl?: string | null
      isProfilePublic?: boolean
      showProgress?: boolean
      showChecklists?: boolean
    } = {}

    if (body.headline !== undefined) {
      updates.headline =
        typeof body.headline === 'string' && body.headline.trim() ? body.headline.trim() : null
    }
    if (body.bio !== undefined) {
      updates.bio = typeof body.bio === 'string' && body.bio.trim() ? body.bio.trim() : null
    }
    if (body.githubUrl !== undefined) {
      updates.githubUrl =
        typeof body.githubUrl === 'string'
          ? normalizeOptionalSocialProfileUrl('github', body.githubUrl)
          : null
    }
    if (body.xUrl !== undefined) {
      updates.xUrl =
        typeof body.xUrl === 'string' ? normalizeOptionalSocialProfileUrl('x', body.xUrl) : null
    }
    if (body.linkedinUrl !== undefined) {
      updates.linkedinUrl =
        typeof body.linkedinUrl === 'string'
          ? normalizeOptionalSocialProfileUrl('linkedin', body.linkedinUrl)
          : null
    }
    if (typeof body.isProfilePublic === 'boolean') updates.isProfilePublic = body.isProfilePublic
    if (typeof body.showProgress === 'boolean') updates.showProgress = body.showProgress
    if (typeof body.showChecklists === 'boolean') updates.showChecklists = body.showChecklists

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const user = await updateProfileForUser(session.user.id, updates)

    trackServerEvent(TELEMETRY_EVENTS.profileUpdated, {
      updatedFields: Object.keys(updates),
      userId: session.user.id
    })

    return NextResponse.json(user)
  } catch (e) {
    if (e instanceof InvalidSocialLinkError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const prismaError = e as { code?: string }
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }
    captureServerException(e, { route: '/api/profile' })
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
