import { auth } from '@repo/auth/auth'
import { prisma } from '@repo/auth/prisma'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { rejectIfBot } from '@/lib/bot-protection'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { captureServerException, trackServerEvent } from '@/lib/telemetry-server'

/** Generates a 12-character alphanumeric public ID for shareable audit URLs. */
function generatePublicId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  const bytes = new Uint8Array(12)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
    for (let i = 0; i < 12; i++) id += chars[bytes[i]! % chars.length]
  } else {
    id = Math.random().toString(36).slice(2, 14)
  }
  return id
}

/**
 * POST: Save an audit result. Optional auth (userId set when logged in).
 * Body: { url: string, summary: object, result: object }
 */
export async function POST(request: Request) {
  try {
    const botResponse = await rejectIfBot()
    if (botResponse) return botResponse

    const session = await auth.api.getSession({ headers: await headers() })
    const body = await request.json()
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const summary = body.summary && typeof body.summary === 'object' ? body.summary : null
    const result = body.result && typeof body.result === 'object' ? body.result : null

    if (!url || !summary || !result) {
      return NextResponse.json({ error: 'Missing url, summary, or result' }, { status: 400 })
    }

    const publicId = generatePublicId()
    const row = await prisma.audit.create({
      data: {
        publicId,
        userId: session?.user?.id ?? null,
        url,
        summary,
        result
      }
    })

    trackServerEvent(TELEMETRY_EVENTS.auditSaved, {
      auditId: row.id,
      publicId: row.publicId,
      userId: session?.user?.id ?? null
    })

    return NextResponse.json({
      id: row.id,
      publicId: row.publicId,
      url: row.url,
      summary: row.summary as object,
      result: row.result as object,
      createdAt: row.createdAt.toISOString()
    })
  } catch (error) {
    captureServerException(error, { route: '/api/audits' })
    return NextResponse.json({ error: 'Failed to save audit' }, { status: 500 })
  }
}

/**
 * GET: List audits for the current user. Requires auth.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.audit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  const audits = rows.map(row => ({
    id: row.id,
    publicId: row.publicId,
    url: row.url,
    summary: row.summary as object,
    createdAt: row.createdAt.toISOString()
  }))

  return NextResponse.json(audits)
}
