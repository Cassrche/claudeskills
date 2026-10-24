import { createResendContactPayload, getResendClient } from '@repo/emails/server'
import { waitlistSchema } from '@repo/schemas'
import { NextResponse } from 'next/server'
import { rejectIfBot } from '@/lib/bot-protection'
import { checkWaitlistRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/**
 * POST function.
 * @param request - request.
 */
export async function POST(request: Request) {
  try {
    const botResponse = await rejectIfBot()
    if (botResponse) return botResponse

    const ip = getClientIp(request)
    const rateLimitResult = await checkWaitlistRateLimit(ip)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      )
    }

    const resend = getResendClient()
    if (!resend) {
      return NextResponse.json(
        { error: 'Waitlist is not configured. Please try again later.' },
        { status: 503 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = waitlistSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]
      const message = firstError?.message ?? 'Validation failed'
      return NextResponse.json(
        { error: message },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      )
    }

    const { email } = parsed.data

    const { data, error } = await resend.contacts.create(
      createResendContactPayload(email, 'waitlist', process.env.RESEND_AUDIENCE_ID)
    )

    if (error) {
      const message = error.message ?? 'Failed to join waitlist'
      const statusCode =
        error.name === 'validation_error' || message.toLowerCase().includes('already') ? 400 : 500
      return NextResponse.json(
        { error: message },
        { status: statusCode, headers: createRateLimitHeaders(rateLimitResult) }
      )
    }

    trackServerEvent(TELEMETRY_EVENTS.waitlistJoined, {
      emailDomain: email.split('@')[1] ?? 'unknown'
    })

    return NextResponse.json(
      { success: true, id: data?.id },
      { status: 201, headers: createRateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    captureServerException(error, { route: '/api/waitlist' })
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
