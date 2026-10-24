import { prisma } from '@repo/auth/prisma'
import { NextResponse } from 'next/server'
import { captureServerException } from '@/lib/telemetry-server'

/**
 * Run a harmless database read so Supabase Free projects stay active.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron secret is not configured' }, { status: 503 })
  }

  const authorization = request.headers.get('authorization')
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.$queryRaw`SELECT 1 AS alive`

    return NextResponse.json({ success: true })
  } catch (error) {
    captureServerException(error, {
      route: '/api/cron/supabase-keepalive'
    })

    return NextResponse.json({ error: 'Supabase keepalive failed' }, { status: 503 })
  }
}
