/**
 * Validates source quality metadata for rule MDX files.
 *
 * Usage:
 *   pnpm validate:evidence                  # validate all rules and fail on issues
 *   pnpm validate:evidence --report         # print repo-wide report without failing
 *   pnpm validate:evidence --json           # output JSON report
 *   pnpm validate:evidence path/to/rule.mdx # validate specific files
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import matter from 'gray-matter'
import { RULES_DIR } from '../lib/rule-structure'
import {
  EVIDENCE_POLICY_PATH,
  type EvidencePolicy,
  loadEvidencePolicy,
  matchesSourceTypeGroup
} from './evidence-policy'

interface RuleSourceFrontmatter {
  id?: string
  title?: string
  url?: string
  type?: string
  role?: string
  authority?: string
}

interface RuleFrontmatter {
  title?: string
  slug?: string
  description?: string
  whyItMatters?: string
  tldr?: string[]
  sources?: RuleSourceFrontmatter[]
  resources?: Array<{ name?: string; url?: string }>
}

interface RuleEvidenceResult {
  filePath: string
  slug: string
  title: string
  category: string
  issues: string[]
}

function isRuleFrontmatter(value: unknown): value is RuleFrontmatter {
  return typeof value === 'object' && value !== null
}

function normalizeType(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function hostnameForUrl(value: string | undefined): string {
  if (!value) return ''

  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function hasSearchClaims(title: string, body: string): boolean {
  return /(googlebot|crawl|index|serp|canonical|robots(?:\smeta|\stxt)?|sitemap|structured data|search console|search central)/i.test(
    `${title} ${body}`
  )
}

function hasCompatibilityClaims(body: string): boolean {
  return /(browser support|supported in|compatibility|baseline|chrome|firefox|safari|edge)/i.test(
    body
  )
}

function collectRuleFiles(explicitFiles: string[]): string[] {
  if (explicitFiles.length > 0) {
    return explicitFiles.map(file => path.resolve(file))
  }

  const files: string[] = []
  const categories = readdirSync(RULES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)

  for (const category of categories) {
    const categoryDir = path.join(RULES_DIR, category)
    for (const file of readdirSync(categoryDir)) {
      if (file.endsWith('.mdx')) {
        files.push(path.join(categoryDir, file))
      }
    }
  }

  return files
}

/**
 * Validate a single rule against the source quality contract.
 *
 * @param filePath - Absolute path to the rule MDX file.
 * @param policy - Effective evidence policy.
 * @returns Rule validation result or null if the file is unreadable.
 */
export function validateEvidenceRule(
  filePath: string,
  policy: EvidencePolicy
): RuleEvidenceResult | null {
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
  const body = parsed.content
  const category = filePath.replace(/\\/g, '/').split('/').at(-2) ?? 'unknown'
  const slug = fm.slug ?? path.basename(filePath, '.mdx')
  const title = fm.title ?? slug
  const issues: string[] = []
  const sources = fm.sources ?? []
  const sourceIds = new Set<string>()
  const sourceUrls = new Set<string>()
  const sourceTypes = new Set<string>()
  const sourceRoles = new Set<string>()
  const sourceHostnames = new Set<string>()
  let primarySourceCount = 0

  if (sources.length < policy.minimumSourceCount) {
    issues.push(`requires at least ${policy.minimumSourceCount} sources`)
  }

  for (const [index, source] of sources.entries()) {
    if (
      typeof source.id !== 'string' ||
      typeof source.title !== 'string' ||
      typeof source.url !== 'string' ||
      typeof source.type !== 'string' ||
      typeof source.role !== 'string' ||
      typeof source.authority !== 'string'
    ) {
      issues.push(`source ${index + 1} is missing required source metadata`)
      continue
    }

    if (sourceIds.has(source.id)) {
      issues.push(`duplicate source id: ${source.id}`)
    }
    if (sourceUrls.has(source.url)) {
      issues.push(`duplicate source URL: ${source.url}`)
    }

    sourceIds.add(source.id)
    sourceUrls.add(source.url)
    sourceTypes.add(normalizeType(source.type))
    sourceRoles.add(source.role)

    const hostname = hostnameForUrl(source.url)
    sourceHostnames.add(hostname)
    const primaryByType = policy.primaryTypes.includes(normalizeType(source.type))
    const primaryByDomain = policy.primaryDomains.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    )
    const isPrimary = source.authority === 'primary' || primaryByType || primaryByDomain
    if (isPrimary) {
      primarySourceCount += 1
    }
  }

  if (sourceRoles.size < policy.minimumDistinctRoles) {
    issues.push(`requires at least ${policy.minimumDistinctRoles} distinct source roles`)
  }

  if (primarySourceCount < policy.minimumPrimarySourceCount) {
    issues.push(`requires at least ${policy.minimumPrimarySourceCount} primary source`)
  }

  const categoryPolicy = policy.categoryPolicies[category]
  if (categoryPolicy?.requiredSourceTypeGroups) {
    for (const group of categoryPolicy.requiredSourceTypeGroups) {
      if (!matchesSourceTypeGroup(sourceTypes, group)) {
        issues.push(`category policy requires one source from: ${group.join(', ')}`)
      }
    }
  }

  if (categoryPolicy?.requiredSourceRoleGroups) {
    for (const group of categoryPolicy.requiredSourceRoleGroups) {
      if (!group.some(role => sourceRoles.has(role))) {
        issues.push(`category policy requires one source role from: ${group.join(', ')}`)
      }
    }
  }

  if (categoryPolicy?.requireGoogleOrSpecForSearchClaims) {
    const searchClaimText = [title, fm.description, fm.whyItMatters, ...(fm.tldr ?? [])]
      .filter(Boolean)
      .join(' ')
    const hasSearchSource =
      sourceTypes.has('google') ||
      sourceTypes.has('spec') ||
      sourceRoles.has('search') ||
      Array.from(sourceHostnames).some(
        hostname =>
          hostname === 'developers.google.com' ||
          hostname.endsWith('.developers.google.com') ||
          hostname.endsWith('googleusercontent.com')
      )

    if (hasSearchClaims(title, searchClaimText) && !hasSearchSource) {
      issues.push('search-facing rule requires a Google Search Central or spec source')
    }
  }

  if (categoryPolicy?.requireStructuredSupportSource && hasCompatibilityClaims(body)) {
    if (!policy.structuredSupportTypes.some(type => sourceTypes.has(type))) {
      issues.push('compatibility/support claims require a structured or standards-based source')
    }
  }

  return {
    filePath,
    slug,
    title,
    category,
    issues
  }
}

async function main() {
  const args = process.argv.slice(2)
  const reportOnly = args.includes('--report')
  const json = args.includes('--json')
  const files = args.filter(arg => arg.endsWith('.mdx'))
  const policy = loadEvidencePolicy(path.join(process.cwd(), EVIDENCE_POLICY_PATH))
  const results = collectRuleFiles(files)
    .map(filePath => validateEvidenceRule(filePath, policy))
    .filter((result): result is RuleEvidenceResult => result !== null)

  const withIssues = results.filter(result => result.issues.length > 0)

  if (json) {
    console.log(JSON.stringify({ rulesChecked: results.length, withIssues }, null, 2))
  } else {
    console.log(`\nValidating sources for ${results.length} rules…\n`)
    console.log('══════════════════════════════════════════════════')
    console.log('  SOURCE QUALITY REPORT')
    console.log('══════════════════════════════════════════════════')
    console.log(`  Rules checked    : ${results.length}`)
    console.log(`  Rules with issues: ${withIssues.length}`)
    console.log('══════════════════════════════════════════════════\n')

    for (const result of withIssues.sort((a, b) => a.slug.localeCompare(b.slug))) {
      console.log(`[!] ${result.slug}`)
      for (const issue of result.issues) {
        console.log(`    · ${issue}`)
      }
    }

    if (withIssues.length === 0) {
      console.log('  ✓ All rules satisfy the source quality contract.\n')
    }
  }

  if (!reportOnly && withIssues.length > 0) {
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
