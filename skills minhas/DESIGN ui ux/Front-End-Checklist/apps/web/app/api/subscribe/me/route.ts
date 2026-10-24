import { auth } from '@repo/auth/auth'
import { addSubscriberContact } from '@repo/emails/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { captureServerException } from '@/lib/telemetry-server'

/**
 * Add the current signed-in user's email to the mailing list audience.
 */
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = session.user.email?.trim()
    if (!email) {
      return NextResponse.json({ error: 'Current user has no email' }, { status: 400 })
    }

    const result = await addSubscriberContact(email)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode })
    }

    return NextResponse.json(result, { status: result.status === 'created' ? 201 : 200 })
  } catch (error) {
    captureServerException(error, { route: '/api/subscribe/me' })
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 })
  }
}
