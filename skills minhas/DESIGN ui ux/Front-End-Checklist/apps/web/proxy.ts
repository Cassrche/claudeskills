import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Continues requests through Next.js proxy while keeping the matcher centralized.
 * @param request - Incoming request metadata.
 * @returns The unmodified next response.
 */
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)'
  ]
}
