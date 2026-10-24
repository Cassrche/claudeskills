/**
 * Normalize rule source metadata across the MDX corpus.
 *
 * Usage:
 *   pnpm backfill:evidence
 *   pnpm backfill:evidence path/to/rule.mdx
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { RULES_DIR } from '../lib/rule-structure'

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
  sources?: RuleSourceFrontmatter[]
  [key: string]: unknown
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

function slugify(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || fallback
}

function inferSourceRole(source: RuleSourceFrontmatter, index: number): string {
  const type = source.type?.toLowerCase()
  const hostname = source.url ? new URL(source.url).hostname.toLowerCase() : ''

  if (type === 'wcag' || type === 'spec') return 'standard'
  if (type === 'google' || hostname.includes('developers.google.com')) return 'search'
  if (type === 'owasp') return 'regulation'
  if (
    hostname.includes('caniuse') ||
    hostname.includes('web-platform-dx') ||
    /baseline|compat/i.test(source.title ?? '')
  ) {
    return 'compatibility'
  }
  if (type === 'mdn' || type === 'documentation') return 'reference'
  if (type === 'guide' || type === 'web.dev' || type === 'article') {
    return index === 0 ? 'reference' : 'implementation'
  }

  return index === 0 ? 'reference' : 'implementation'
}

function inferSourceAuthority(source: RuleSourceFrontmatter): string {
  const type = source.type?.toLowerCase()
  const hostname = source.url ? new URL(source.url).hostname.toLowerCase() : ''

  if (
    type === 'wcag' ||
    type === 'spec' ||
    type === 'owasp' ||
    type === 'google' ||
    hostname.endsWith('w3.org') ||
    hostname.endsWith('developer.mozilla.org') ||
    hostname.endsWith('developers.google.com') ||
    hostname.endsWith('googleusercontent.com') ||
    hostname.endsWith('developer.chrome.com') ||
    hostname.endsWith('developer.apple.com') ||
    hostname.endsWith('m3.material.io') ||
    hostname.endsWith('web.dev') ||
    hostname.startsWith('developer.') ||
    hostname.startsWith('developers.') ||
    hostname.startsWith('docs.') ||
    hostname.startsWith('learn.') ||
    hostname.endsWith('playwright.dev') ||
    hostname.endsWith('testing-library.com') ||
    hostname.endsWith('cypress.io') ||
    hostname.endsWith('jestjs.io') ||
    hostname.endsWith('vitest.dev') ||
    hostname.endsWith('storybook.js.org') ||
    hostname.endsWith('stryker-mutator.io')
  ) {
    return 'primary'
  }

  return 'secondary'
}

function ensureDistinctRoles(
  sources: Array<RuleSourceFrontmatter & { role: string }>
): Array<RuleSourceFrontmatter & { role: string }> {
  const roles = new Set(sources.map(source => source.role))
  if (roles.size >= 2 || sources.length < 2) {
    return sources
  }

  return sources.map((source, index) => ({
    ...source,
    role: index === 0 ? source.role : 'implementation'
  }))
}

async function main() {
  const files = collectRuleFiles(process.argv.slice(2).filter(arg => arg.endsWith('.mdx')))

  for (const filePath of files) {
    const raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
    const parsed = matter(raw)
    const frontmatter = parsed.data as RuleFrontmatter
    const existingSources = frontmatter.sources ?? []
    const normalizedSources = ensureDistinctRoles(
      existingSources.map((source, index) => ({
        ...source,
        id: source.id || slugify(source.title || `source-${index + 1}`, `source-${index + 1}`),
        role: source.role || inferSourceRole(source, index),
        authority: source.authority === 'primary' ? 'primary' : inferSourceAuthority(source)
      }))
    )
    const nextData = {
      ...frontmatter,
      sources: normalizedSources
    }
    delete nextData.evidence

    writeFileSync(filePath, matter.stringify(parsed.content, nextData))
  }

  console.log(`Normalized source metadata for ${files.length} rule files.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
