import { MCP_SERVER_URL, SITE_URL } from '@repo/config'
import type { CuratedChecklist } from '@repo/types'

type Difficulty = CuratedChecklist['difficulty']

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

/**
 * Check whether a value is a supported checklist difficulty.
 *
 * @param value - Difficulty candidate to validate.
 * @returns True when the value matches a known checklist difficulty.
 */
export function isChecklistDifficulty(value: string | undefined): value is Difficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced'
}

/**
 * Collect the deployment origins trusted for browser access to the MCP route.
 *
 * @param request - Incoming HTTP request.
 * @returns Set of trusted origins derived from request and deployment config.
 */
export function getTrustedOrigins(request: Request): Set<string> {
  const trustedOrigins = new Set<string>()

  for (const candidate of [request.url, SITE_URL, MCP_SERVER_URL]) {
    try {
      trustedOrigins.add(new URL(candidate).origin)
    } catch {
      // Ignore invalid deployment values.
    }
  }

  return trustedOrigins
}

/**
 * Check whether the request origin is allowed to access the MCP route.
 *
 * @param request - Incoming HTTP request.
 * @returns True when the origin header is absent or trusted.
 */
export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    return true
  }

  return getTrustedOrigins(request).has(origin)
}

/**
 * Merge one or more header objects into a single plain record.
 *
 * @param headerObjects - Header objects to merge.
 * @returns A merged header record.
 */
export function mergeHeaders(...headerObjects: Record<string, string>[]): Record<string, string> {
  return Object.assign({}, ...headerObjects)
}

/**
 * Build CORS headers for the MCP route based on the current request origin.
 *
 * @param request - Incoming HTTP request.
 * @returns CORS headers for the response.
 */
export function createCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!origin || !isOriginAllowed(request)) {
    return corsHeaders
  }

  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin'
  }
}
