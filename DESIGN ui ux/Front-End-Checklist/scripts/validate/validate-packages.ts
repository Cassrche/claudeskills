/**
 * Validates npm packages referenced in rule frontmatter.
 * Flags packages that are:
 *   - Not found on npm registry
 *   - Below 10k weekly downloads
 *   - Not updated in the last 18 months
 *
 * Usage:
 *   pnpm validate:packages                    # check all rules
 *   pnpm validate:packages path/to/rule.mdx   # check specific file
 *   pnpm validate:packages --min-downloads 50000  # custom threshold
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const RULES_DIR = path.join(process.cwd(), 'packages/content/rules/en')
const NPM_REGISTRY = 'https://registry.npmjs.org'
const NPM_DOWNLOADS_API = 'https://api.npmjs.org/downloads/point/last-week'
const CONCURRENCY = 8
const DEFAULT_MIN_DOWNLOADS = 10_000
const DEFAULT_MAX_AGE_MONTHS = 18

interface PackageResult {
  name: string
  found: boolean
  weeklyDownloads: number
  lastPublish: string
  version: string
  issues: string[]
}

interface RuleResult {
  filePath: string
  slug: string
  title: string
  packages: PackageResult[]
  issues: string[]
}

async function checkPackage(
  name: string,
  minDownloads: number,
  maxAgeMonths: number
): Promise<PackageResult> {
  const encoded = encodeURIComponent(name).replace('%40', '@').replace('%2F', '/')
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - maxAgeMonths)

  try {
    const [metaRes, dlRes] = await Promise.all([
      fetch(`${NPM_REGISTRY}/${encoded}/latest`, { headers: { Accept: 'application/json' } }),
      fetch(`${NPM_DOWNLOADS_API}/${encoded}`, { headers: { Accept: 'application/json' } })
    ])

    if (!metaRes.ok) {
      return {
        name,
        found: false,
        weeklyDownloads: 0,
        lastPublish: '',
        version: '',
        issues: [`package not found on npm (HTTP ${metaRes.status})`]
      }
    }

    const meta = (await metaRes.json()) as {
      version: string
      time?: { modified?: string }
    }
    const dlData = dlRes.ok ? ((await dlRes.json()) as { downloads?: number }) : {}

    const weeklyDownloads = dlData.downloads ?? 0
    const lastPublish = meta.time?.modified ?? ''
    const issues: string[] = []

    if (weeklyDownloads < minDownloads) {
      issues.push(
        `low downloads: ${weeklyDownloads.toLocaleString()}/week (min ${minDownloads.toLocaleString()})`
      )
    }

    if (lastPublish && new Date(lastPublish) < cutoff) {
      const monthsAgo = Math.round(
        (Date.now() - new Date(lastPublish).getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
      issues.push(`stale: last publish ${monthsAgo} months ago (max ${maxAgeMonths})`)
    }

    return {
      name,
      found: true,
      weeklyDownloads,
      lastPublish,
      version: meta.version,
      issues
    }
  } catch (err) {
    return {
      name,
      found: false,
      weeklyDownloads: 0,
      lastPublish: '',
      version: '',
      issues: [`fetch error: ${(err as Error).message}`]
    }
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
  minDownloads: number,
  maxAgeMonths: number
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

  const fm = parsed.data as { title?: string; slug?: string; npmPackages?: string[] }
  const slug = fm.slug ?? path.basename(filePath, '.mdx')
  const title = fm.title ?? slug

  if (!fm.npmPackages || fm.npmPackages.length === 0) {
    return null // Skip rules without npm packages
  }

  const pkgResults = await runConcurrently(
    fm.npmPackages.map(name => () => checkPackage(name, minDownloads, maxAgeMonths)),
    CONCURRENCY
  )

  const allIssues = pkgResults.flatMap(p => p.issues.map(issue => `${p.name}: ${issue}`))

  return { filePath, slug, title, packages: pkgResults, issues: allIssues }
}

async function main() {
  const args = process.argv.slice(2)
  const files = args.filter(a => a.endsWith('.mdx'))

  const minDownloadsArg = args.find(a => a.startsWith('--min-downloads='))
  const minDownloads = minDownloadsArg
    ? parseInt(minDownloadsArg.split('=')[1], 10)
    : DEFAULT_MIN_DOWNLOADS

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

  console.log(`\nValidating npm packages for ${toCheck.length} rules…\n`)

  const allResults = await runConcurrently(
    toCheck.map(f => () => validateRule(f, minDownloads, DEFAULT_MAX_AGE_MONTHS)),
    CONCURRENCY
  )

  const results = allResults.filter((r): r is RuleResult => r !== null)
  const withIssues = results.filter(r => r.issues.length > 0)
  const passing = results.filter(r => r.issues.length === 0)

  console.log('══════════════════════════════════════════════════')
  console.log('  NPM PACKAGES VALIDATION REPORT')
  console.log('══════════════════════════════════════════════════')
  console.log(`  Rules with npm packages : ${results.length}`)
  console.log(`  Passing                 : ${passing.length}`)
  console.log(`  With issues             : ${withIssues.length}`)
  console.log(`  Min weekly downloads    : ${minDownloads.toLocaleString()}`)
  console.log(`  Max package age         : ${DEFAULT_MAX_AGE_MONTHS} months`)
  console.log('══════════════════════════════════════════════════\n')

  for (const r of withIssues.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`[!] ${r.slug}`)
    for (const issue of r.issues) {
      console.log(`    · ${issue}`)
    }
    console.log()
  }

  if (withIssues.length === 0 && results.length > 0) {
    console.log('  ✓ All referenced npm packages meet quality thresholds.\n')
  }

  if (results.length === 0) {
    console.log(
      '  ℹ No rules with npmPackages found yet. Add npm package names to rule frontmatter:\n'
    )
    console.log('    npmPackages:')
    console.log('      - eslint')
    console.log('      - prettier\n')
  }

  if (files.length > 0 && withIssues.length > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
