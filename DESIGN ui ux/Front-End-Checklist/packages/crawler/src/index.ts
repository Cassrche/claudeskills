/**
 * Multi-page crawler for Front-End Checklist audits.
 * Fetches a base URL, discovers same-origin links up to a depth and page limit,
 * runs audit_url on each page, and aggregates results.
 */

import { BOT_USER_AGENT } from '@repo/config'
import type { AuditUrlResult } from '@repo/mcp'
import { executeAuditUrl } from '@repo/mcp'
import { loadRules } from '@repo/mcp/load-rules'

export interface CrawlOptions {
  maxPages?: number
  maxDepth?: number
  sameOriginOnly?: boolean
  minPriority?: 'critical' | 'high' | 'medium' | 'low'
  rulesDir?: string
}

export interface PageResult {
  url: string
  success: boolean
  error?: string
  result?: AuditUrlResult
}

export interface CrawlResult {
  baseUrl: string
  pages: PageResult[]
  summary: {
    totalPages: number
    pagesWithIssues: number
    totalIssues: number
    totalCritical: number
    totalHigh: number
  }
}

const DEFAULT_OPTIONS: Required<Omit<CrawlOptions, 'rulesDir'>> = {
  maxPages: 25,
  maxDepth: 2,
  sameOriginOnly: true,
  minPriority: 'medium'
}

function parseLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const origin = base.origin
  const links = new Set<string>()
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi
  let match = hrefRegex.exec(html)
  while (match !== null) {
    const raw = match[1]!.trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue
    try {
      const url = new URL(raw, baseUrl)
      if (url.origin !== origin) continue
      if (url.pathname === base.pathname && url.search === base.search) continue
      const normalized = url.origin + url.pathname + url.search
      links.add(normalized)
    } catch {
      // ignore invalid URLs
    }
    match = hrefRegex.exec(html)
  }
  return Array.from(links)
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BOT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml'
    },
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
    throw new Error('Not HTML')
  }
  return res.text()
}

export async function crawl(baseUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const rules = loadRules(options.rulesDir)
  if (rules.length === 0) {
    throw new Error('No rules loaded. Install the public rules package or set rulesDir.')
  }

  const seen = new Set<string>()
  const toVisit: { url: string; depth: number }[] = [{ url: baseUrl, depth: 0 }]
  const pages: PageResult[] = []

  while (toVisit.length > 0 && pages.length < opts.maxPages) {
    const { url, depth } = toVisit.shift()!
    const normalized = url.replace(/#.*$/, '')
    if (seen.has(normalized)) continue
    seen.add(normalized)

    let result: AuditUrlResult | { error: string }
    try {
      result = await executeAuditUrl({ url: normalized, minPriority: opts.minPriority }, rules)
    } catch (err) {
      result = { error: err instanceof Error ? err.message : String(err) }
    }

    if ('error' in result) {
      pages.push({ url: normalized, success: false, error: result.error })
    } else {
      pages.push({ url: normalized, success: true, result })
      if (depth < opts.maxDepth) {
        const html = await fetchHtml(normalized).catch(() => '')
        const links = parseLinks(html, normalized)
        for (const link of links) {
          const clean = link.replace(/#.*$/, '')
          if (!seen.has(clean)) toVisit.push({ url: clean, depth: depth + 1 })
        }
      }
    }
  }

  const withIssues = pages.filter(
    p => p.success && p.result && (p.result.summary.issuesFound ?? 0) > 0
  )
  const totalIssues = pages.reduce((s, p) => s + (p.result?.summary?.issuesFound ?? 0), 0)
  const totalCritical = pages.reduce((s, p) => s + (p.result?.summary?.criticalIssues ?? 0), 0)
  const totalHigh = pages.reduce((s, p) => s + (p.result?.summary?.highIssues ?? 0), 0)

  return {
    baseUrl,
    pages,
    summary: {
      totalPages: pages.length,
      pagesWithIssues: withIssues.length,
      totalIssues,
      totalCritical,
      totalHigh
    }
  }
}
