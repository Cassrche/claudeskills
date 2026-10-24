import { auth } from '@repo/auth/auth'
import { prisma } from '@repo/auth/prisma'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackServerEvent } from '@/lib/telemetry-server'

/**
 * Exports all data for the authenticated user as a JSON download.
 * Includes profile info, checklists, rule progress, and audit history.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [user, checklists, progress, audits] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, createdAt: true }
    }),
    prisma.userChecklist.findMany({ where: { userId } }),
    prisma.ruleProgress.findMany({ where: { userId } }),
    prisma.audit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt.toISOString()
        }
      : null,
    checklists: checklists.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      framework: c.framework,
      ruleIds: c.ruleIds,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString()
    })),
    progress: progress.map(p => ({
      ruleId: p.ruleId,
      completed: p.completed,
      completedAt: p.completedAt?.toISOString(),
      notes: p.notes
    })),
    audits: audits.map(a => ({
      id: a.id,
      publicId: a.publicId,
      url: a.url,
      createdAt: a.createdAt.toISOString()
    }))
  }

  trackServerEvent(TELEMETRY_EVENTS.accountExported, { userId })

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="frontend-checklist-export-${new Date().toISOString().split('T')[0]}.json"`
    }
  })
}
