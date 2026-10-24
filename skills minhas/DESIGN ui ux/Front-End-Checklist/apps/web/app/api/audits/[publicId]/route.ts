import { prisma } from '@repo/auth/prisma'
import { NextResponse } from 'next/server'

/**
 * GET: Fetch a single audit by publicId (for shareable report). No auth required.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params
  if (!publicId) {
    return NextResponse.json({ error: 'Missing publicId' }, { status: 400 })
  }

  const row = await prisma.audit.findUnique({
    where: { publicId }
  })

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: row.id,
    publicId: row.publicId,
    url: row.url,
    summary: row.summary as object,
    result: row.result as object,
    createdAt: row.createdAt.toISOString()
  })
}
