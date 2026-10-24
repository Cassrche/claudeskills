/**
 * Validates that all URLs in rule frontmatter (resources + sources) resolve.
 * Flags 404s, redirects, and missing authoritative sources.
 *
 * Usage:
 *   pnpm validate:sources                   # check all rules
 *   pnpm validate:sources --no-sources      # only flag rules with zero sources
 *   pnpm validate:sources --allow-bot-blocked-domain=example.com
 *   pnpm validate:sources --allow-bot-blocked-url=https://example.com/path
 *   pnpm validate:sources path/to/rule.mdx  # check specific file
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import {
  classifyFetchError,
  classifyHttpResult,
  loadPolicyFile,
  mergePolicies,
  parsePolicyArgs,
  SOURCE_VALIDATION_POLICY_PATH,
  type UrlClassification
} from './source-validation-policy'

const RULES_DIR = path.join(process.cwd(), 'packages/content/rules/en')
const POLICY_CONFIG_PATH = path.join(process.cwd(), SOURCE_VALIDATION_POLICY_PATH)
const CONCURRENCY = 5
const TIMEOUT_MS = 15000
const TRANSIENT_RETRIES = 1

type ValidationMethod = 'HEAD' | 'GET'

interface RuleFrontmatter {
  title?: string
  slug?: string
  sources?: Array<{ title: string; url: string; type: string }>
  resources?: Array<{ url: string; name?: string }>
}

interface UrlResult {
  url: string
  status: number | 'timeout' | 'error'
  classification: UrlClassification
  ok: boolean
  note?: string
}

interface RuleResult {
  filePath: string
  slug: string
  title: string
  hasSources: boolean
  urlResults: UrlResult[]
  issues: string[]
}

/**
 * Fetch a URL with a method-specific timeout.
 *
 * @param url - URL to validate.
 * @param method - HTTP method used for the validation request.
 * @returns Fetch response from the remote source.
 */
async function fetchWithTimeout(url: string, method: ValidationMethod): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      headers: { 'User-Agent': 'frontendchecklist-validator/1.0' },
      redirect: 'follow'
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Check whether parsed frontmatter can be treated as a rule-frontmatter object.
 *
 * @param value - Parsed frontmatter payload.
 * @returns True when the value is a plain object.
 */
function isRuleFrontmatter(value: unknown): value is RuleFrontmatter {
  return typeof value === 'object' && value !== null
}

async function checkUrl(
  url: string,
  policyConfig: ReturnType<typeof mergePolicies>
): Promise<UrlResult> {
  let lastError: Error | null = null

  for (const method of ['HEAD', 'GET'] satisfies ValidationMethod[]) {
    for (let attempt = 0; attempt <= TRANSIENT_RETRIES; attempt += 1) {
      try {
        const res = await fetchWithTimeout(url, method)
        const classified = classifyHttpResult({
          url,
          status: res.status,
          redirected: res.redirected,
          policy: policyConfig
        })

        if (classified.ok || method === 'GET') {
          return {
            url,
            status: res.status,
            classification: classified.classification,
            ok: classified.ok,
            note: classified.note
          }
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }
  }

  const error = lastError ?? new Error('fetch failed')
  const classified = classifyFetchError(error)
  return {
    url,
    status: classified.classification === 'timeout' ? 'timeout' : 'error',
    classification: classified.classification,
    ok: classified.ok,
    note: classified.note
  }
}

async function runConcurrently<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = []
  const queue = [...tasks]

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift()
      if (task) results.push(await task())
    }
  }

  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

async function validateRule(
  filePath: string,
  policyConfig: ReturnType<typeof mergePolicies>
): Promise<RuleResult | null> {
  let raw: string
  try {
    raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
  } catch {
    return null
  }

  let parsed: ReturnType<typeof matter>
  try {
    parsed = matter(raw)
  } catch {
    return null
  }

  const fm = isRuleFrontmatter(parsed.data) ? parsed.data : {}
  const slug = fm.slug ?? path.basename(filePath, '.mdx')
  const title = fm.title ?? slug

  const urls: string[] = [
    ...(fm.sources ?? []).map(s => s.url),
    ...(fm.resources ?? []).map(r => r.url)
  ]

  const urlTasks = urls.map(url => async () => checkUrl(url, policyConfig))

  const urlResults = await runConcurrently(urlTasks, CONCURRENCY)

  const issues: string[] = []

  if (!fm.sources || fm.sources.length === 0) {
    issues.push('no authoritative sources — add at least one MDN, WCAG, or spec link')
  }

  for (const result of urlResults) {
    if (!result.ok) {
      issues.push(
        `broken URL: ${result.url} (${result.classification}${result.note ? ` — ${result.note}` : ''})`
      )
    }
  }

  return {
    filePath,
    slug,
    title,
    hasSources: (fm.sources?.length ?? 0) > 0,
    urlResults,
    issues
  }
}

async function main() {
  const args = process.argv.slice(2)
  const noSourcesOnly = args.includes('--no-sources')
  const files = args.filter(a => a.endsWith('.mdx'))
  const policyConfig = mergePolicies(loadPolicyFile(POLICY_CONFIG_PATH), parsePolicyArgs(args))

  const toCheck: string[] = []

  if (files.length > 0) {
    toCheck.push(...files.map(f => path.resolve(f)))
  } else {
    const categories = readdirSync(RULES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    for (const cat of categories) {
      const catDir = path.join(RULES_DIR, cat)
      for (const file of readdirSync(catDir).filter(f => f.endsWith('.mdx'))) {
        toCheck.push(path.join(catDir, file))
      }
    }
  }

  console.log(`\nValidating sources for ${toCheck.length} rules…\n`)

  const results = await runConcurrently(
    toCheck.map(f => () => validateRule(f, policyConfig)),
    CONCURRENCY
  )

  const valid = results.filter((r): r is RuleResult => r !== null)
  const withIssues = valid.filter(r => r.issues.length > 0)
  const noSources = valid.filter(r => !r.hasSources)
  const brokenUrls = valid.filter(r => r.urlResults.some(u => !u.ok))
  const brokenUrlCount = valid.reduce((count, rule) => {
    return count + rule.urlResults.filter(result => !result.ok).length
  }, 0)
  const botBlockedValidUrls = valid.reduce((count, rule) => {
    return count + rule.urlResults.filter(result => result.classification === 'bot_blocked').length
  }, 0)
  const redirectUrls = valid.reduce((count, rule) => {
    return count + rule.urlResults.filter(result => result.classification === 'redirect').length
  }, 0)

  if (noSourcesOnly) {
    console.log(`Rules missing authoritative sources: ${noSources.length}/${valid.length}\n`)
    for (const r of noSources.sort((a, b) => a.slug.localeCompare(b.slug))) {
      console.log(`  · ${r.slug}`)
    }
    return
  }

  // Summary
  console.log('══════════════════════════════════════════════════')
  console.log('  SOURCE VALIDATION REPORT')
  console.log('══════════════════════════════════════════════════')
  console.log(`  Rules checked    : ${valid.length}`)
  console.log(`  Missing sources  : ${noSources.length}`)
  console.log(`  Broken URLs      : ${brokenUrlCount}`)
  console.log(`  Bot-blocked valid: ${botBlockedValidUrls}`)
  console.log(`  Redirect URLs    : ${redirectUrls}`)
  console.log(`  Rules with issues: ${withIssues.length}`)
  console.log('══════════════════════════════════════════════════\n')

  for (const r of withIssues.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`[!] ${r.slug}`)
    for (const issue of r.issues) {
      console.log(`    · ${issue}`)
    }
  }

  if (withIssues.length === 0) {
    console.log('  ✓ All rules have verified sources and valid URLs.\n')
  }

  // Exit 1 if specific files were checked and have broken URLs
  if (files.length > 0 && brokenUrls.length > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
