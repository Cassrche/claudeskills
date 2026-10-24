import { BOT_USER_AGENT } from '@repo/config'
import type { Category, Priority, Rule } from '@repo/types'
import {
  NUMBER_SCHEMA,
  OPEN_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
  PRIORITY_SCHEMA,
  STRING_ARRAY_SCHEMA,
  STRING_SCHEMA
} from './metadata'
import { executeReviewCode, type ReviewCodeResult } from './review-code'

export interface AuditUrlInput {
  url: string
  focus?: Category[]
  minPriority?: Priority
}

export interface AuditUrlResult extends ReviewCodeResult {
  source: {
    url: string
    fetchedAt: string
    contentLength: number
  }
}

export const auditUrlDefinition = {
  name: 'audit_url',
  title: 'Audit Live URL',
  description: `Fetches a public URL and audits its HTML against frontend best practice rules. **Use this tool** when you want to check a live website without manually pasting HTML. Automatically fetches the page source and runs the same heuristic checks as review_code.

**Workflow:** Call audit_url with a public https:// URL → get back a prioritized issue list → use fix_rule for remediation guidance on each issue.`,
  annotations: OPEN_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description:
          'Public URL to audit. Must use https://. Private IPs and localhost are blocked.'
      },
      focus: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'html',
            'css',
            'javascript',
            'performance',
            'accessibility',
            'seo',
            'security',
            'images'
          ]
        },
        description:
          'Optional: Focus review on specific categories (default: auto-detect from fetched HTML)'
      },
      minPriority: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'Optional: Minimum priority level to report (default: medium)'
      }
    },
    required: ['url']
  },
  outputSchema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'object',
        properties: {
          totalChecks: NUMBER_SCHEMA,
          issuesFound: NUMBER_SCHEMA,
          criticalIssues: NUMBER_SCHEMA,
          highIssues: NUMBER_SCHEMA,
          categories: STRING_ARRAY_SCHEMA
        }
      },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rule: STRING_SCHEMA,
            title: STRING_SCHEMA,
            priority: PRIORITY_SCHEMA,
            issue: STRING_SCHEMA,
            fixPrompt: STRING_SCHEMA
          }
        }
      },
      suggestions: STRING_ARRAY_SCHEMA,
      source: {
        type: 'object',
        properties: {
          url: STRING_SCHEMA,
          fetchedAt: STRING_SCHEMA,
          contentLength: NUMBER_SCHEMA
        }
      },
      error: STRING_SCHEMA
    }
  }
}

/**
 * Validate that a URL is safe to fetch (no SSRF vectors)
 */
function validateUrl(rawUrl: string): { valid: true; url: URL } | { valid: false; error: string } {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { valid: false, error: `Invalid URL: "${rawUrl}"` }
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only https:// URLs are supported' }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block localhost variants
  if (hostname === 'localhost' || hostname === '0.0.0.0') {
    return { valid: false, error: 'Private/localhost URLs are not allowed' }
  }

  // Block IPv4 private ranges and loopback
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const ipv4Match = hostname.match(ipv4Pattern)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    if (
      a === 10 || // 10.x.x.x
      a === 127 || // 127.x.x.x (loopback)
      (a === 172 && b >= 16 && b <= 31) || // 172.16-31.x.x
      (a === 192 && b === 168) || // 192.168.x.x
      (a === 169 && b === 254) // 169.254.x.x (link-local)
    ) {
      return { valid: false, error: 'Private IP addresses are not allowed' }
    }
  }

  // Block IPv6 loopback
  if (hostname === '::1' || hostname === '[::1]') {
    return { valid: false, error: 'Private/localhost URLs are not allowed' }
  }

  return { valid: true, url: parsed }
}

/**
 * Execute audit_url tool
 */
export async function executeAuditUrl(
  input: AuditUrlInput,
  rules: Rule[]
): Promise<AuditUrlResult | { error: string }> {
  const { url: rawUrl, focus, minPriority } = input

  // Validate URL safety
  const validation = validateUrl(rawUrl)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const url = validation.url

  // Fetch the page HTML
  let html: string
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': BOT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      return { error: `Failed to fetch URL: HTTP ${response.status} ${response.statusText}` }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { error: `URL does not serve HTML content (got: ${contentType})` }
    }

    html = await response.text()
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return { error: 'Request timed out after 8 seconds' }
    }
    return { error: `Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }

  // Run the same review as review_code
  const reviewResult = executeReviewCode({ code: html, focus, minPriority }, rules)

  return {
    ...reviewResult,
    source: {
      url: url.toString(),
      fetchedAt: new Date().toISOString(),
      contentLength: html.length
    }
  }
}
