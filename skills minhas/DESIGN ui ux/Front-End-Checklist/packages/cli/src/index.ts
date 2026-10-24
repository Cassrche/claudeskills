#!/usr/bin/env node

/**
 * Front-End Checklist — standalone audit CLI
 *
 * Usage (from repo root):
 *   pnpm exec frontendchecklist audit <url> [options]
 *   pnpm --filter @frontendchecklist/cli exec frontendchecklist audit https://example.com
 *
 * Options:
 *   --format, -f   Output format: console | json | md | html  (default: console)
 *   --categories   Comma-separated categories to focus (e.g. accessibility,seo)
 *   --min-priority Minimum priority: critical | high | medium | low  (default: medium)
 *
 * Uses the public rules package by default.
 */

import { SITE_URL } from '@repo/config'
import type { AuditUrlResult } from '@repo/mcp'
import { executeAuditUrl } from '@repo/mcp'
import { loadRules } from '@repo/mcp/load-rules'

const REPORT_URL = `${SITE_URL}/en/mcp`

type Format = 'console' | 'json' | 'md' | 'html'

const VALID_CATEGORIES = [
  'html',
  'css',
  'javascript',
  'performance',
  'accessibility',
  'seo',
  'security',
  'images',
  'testing',
  'general'
] as const

const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const

function parseArgs(argv: string[]): {
  command: string
  url: string
  format: Format
  categories: string[]
  minPriority: string
  save: boolean
} | null {
  const args = argv.slice(2)
  if (args.length === 0) {
    return null
  }
  const first = args[0]
  const isAuditCommand = first === 'audit'
  const url = isAuditCommand ? args[1] : first
  if (!url || url.startsWith('--')) {
    return null
  }
  const restStart = isAuditCommand ? 2 : 1

  let format: Format = 'console'
  const categories: string[] = []
  let minPriority = 'medium'
  let save = false

  for (let i = restStart; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--save' || arg === '-s') {
      save = true
    } else if (arg === '--format' || arg === '-f') {
      const next = args[i + 1]
      if (next && ['console', 'json', 'md', 'html'].includes(next)) {
        format = next as Format
        i++
      }
    } else if (arg === '--categories') {
      const next = args[i + 1]
      if (next) {
        categories.push(
          ...next
            .split(',')
            .map(c => c.trim().toLowerCase())
            .filter(Boolean)
        )
        i++
      }
    } else if (arg === '--min-priority') {
      const next = args[i + 1]
      if (next && VALID_PRIORITIES.includes(next as (typeof VALID_PRIORITIES)[number])) {
        minPriority = next
        i++
      }
    }
  }

  const focus =
    categories.length > 0
      ? categories.filter(c => VALID_CATEGORIES.includes(c as (typeof VALID_CATEGORIES)[number]))
      : undefined

  return {
    command: 'audit',
    url,
    format,
    categories: focus ?? [],
    minPriority,
    save
  }
}

function formatConsole(result: AuditUrlResult): string {
  const lines: string[] = []
  const s = result.summary
  lines.push('')
  lines.push(`  URL: ${result.source?.url ?? 'unknown'}`)
  lines.push(
    `  Checks: ${s.totalChecks}  Issues: ${s.issuesFound}  Critical: ${s.criticalIssues}  High: ${s.highIssues}`
  )
  lines.push('')
  if (result.issues.length > 0) {
    lines.push('  Issues:')
    for (const issue of result.issues) {
      const priorityTag = issue.priority.toUpperCase()
      lines.push(`    [${priorityTag}] ${issue.rule}: ${issue.issue}`)
    }
    lines.push('')
  }
  if (result.suggestions.length > 0) {
    lines.push('  Suggestions:')
    for (const sug of result.suggestions) {
      lines.push(`    - ${sug}`)
    }
    lines.push('')
  }
  lines.push(`  View full report: ${REPORT_URL}`)
  lines.push('')
  return lines.join('\n')
}

function formatJson(result: AuditUrlResult): string {
  return JSON.stringify(result, null, 2)
}

function formatMarkdown(result: AuditUrlResult): string {
  const lines: string[] = []
  const s = result.summary
  lines.push(`# Audit: ${result.source?.url ?? 'unknown'}`)
  lines.push('')
  lines.push(`- **Checks:** ${s.totalChecks}`)
  lines.push(
    `- **Issues:** ${s.issuesFound} (Critical: ${s.criticalIssues}, High: ${s.highIssues})`
  )
  lines.push('')
  if (result.issues.length > 0) {
    lines.push('## Issues')
    lines.push('')
    for (const issue of result.issues) {
      lines.push(`- **${issue.priority}** [${issue.rule}] ${issue.title}: ${issue.issue}`)
    }
    lines.push('')
  }
  if (result.suggestions.length > 0) {
    lines.push('## Suggestions')
    lines.push('')
    for (const sug of result.suggestions) {
      lines.push(`- ${sug}`)
    }
    lines.push('')
  }
  lines.push(`[View full report](${REPORT_URL})`)
  return lines.join('\n')
}

function formatHtml(result: AuditUrlResult): string {
  const s = result.summary
  const issuesRows = result.issues
    .map(
      i =>
        `<tr><td>${i.priority}</td><td>${escapeHtml(i.rule)}</td><td>${escapeHtml(i.title)}</td><td>${escapeHtml(i.issue)}</td></tr>`
    )
    .join('')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Front-End Checklist Audit: ${escapeHtml(result.source?.url ?? '')}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    .meta { margin-bottom: 1.5rem; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>Front-End Checklist Audit</h1>
  <div class="meta">
    <p><strong>URL:</strong> ${escapeHtml(result.source?.url ?? '')}</p>
    <p><strong>Checks:</strong> ${s.totalChecks} &nbsp; <strong>Issues:</strong> ${s.issuesFound} (Critical: ${s.criticalIssues}, High: ${s.highIssues})</p>
  </div>
  <h2>Issues</h2>
  <table>
    <thead><tr><th>Priority</th><th>Rule</th><th>Title</th><th>Issue</th></tr></thead>
    <tbody>${issuesRows || '<tr><td colspan="4">No issues found.</td></tr>'}</tbody>
  </table>
  ${result.suggestions.length > 0 ? `<h2>Suggestions</h2><ul>${result.suggestions.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
  <p><a href="${REPORT_URL}">View full report</a></p>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function main() {
  const parsed = parseArgs(process.argv)
  if (!parsed) {
    console.error(
      'Usage: frontendchecklist [audit] <url> [--format console|json|md|html] [--categories a11y,seo] [--min-priority high]'
    )
    process.exit(1)
  }

  const rules = loadRules()
  if (rules.length === 0) {
    console.error('No rules found. Install the public rules package or run from the monorepo.')
    process.exit(1)
  }

  const result = await executeAuditUrl(
    {
      url: parsed.url,
      focus:
        parsed.categories.length > 0
          ? (parsed.categories as Parameters<typeof executeAuditUrl>[0]['focus'])
          : undefined,
      minPriority: parsed.minPriority as Parameters<typeof executeAuditUrl>[0]['minPriority']
    },
    rules
  )

  if ('error' in result) {
    console.error(result.error)
    process.exit(1)
  }

  const baseUrl = process.env.FRONTENDCHECKLIST_BASE_URL ?? SITE_URL
  if (parsed.save) {
    try {
      const saveRes = await fetch(`${baseUrl}/api/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: result.source?.url ?? parsed.url,
          summary: result.summary,
          result
        })
      })
      if (saveRes.ok) {
        const data = (await saveRes.json()) as { publicId?: string }
        if (data.publicId) {
          const reportUrl = `${baseUrl}/en/report/${data.publicId}`
          process.stdout.write(`Report saved: ${reportUrl}\n`)
        }
      }
    } catch {
      console.error('Could not save report to dashboard.')
    }
  }

  let out: string
  switch (parsed.format) {
    case 'json':
      out = formatJson(result)
      break
    case 'md':
      out = formatMarkdown(result)
      break
    case 'html':
      out = formatHtml(result)
      break
    default:
      out = formatConsole(result)
  }

  process.stdout.write(`${out}\n`)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
