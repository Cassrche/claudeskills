import { prisma } from '@repo/auth/prisma'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * GET: Fetch a checklist by its publicId. No auth required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params

  const row = await prisma.userChecklist.findFirst({
    where: { publicId }
  })

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: row.id,
    publicId: row.publicId,
    name: row.name,
    description: row.description ?? undefined,
    framework: row.framework ?? undefined,
    ruleIds: row.ruleIds,
    color: row.color ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  })
}
