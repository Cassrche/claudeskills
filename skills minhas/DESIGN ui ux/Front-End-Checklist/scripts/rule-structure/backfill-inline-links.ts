/**
 * Deprecated write path for sparse inline-link backfills.
 *
 * Usage:
 *   pnpm tsx scripts/rule-structure/backfill-inline-links.ts --category=performance
 */

import path from 'node:path'
import matter from 'gray-matter'
import {
  analyzeRuleInlineLinks,
  buildExternalLinkCandidates,
  buildInternalLinkCandidates
} from '../lib/rule-inline-links'
import { collectRuleFiles, readRuleFile } from '../lib/rule-structure'
import { EVIDENCE_POLICY_PATH, loadEvidencePolicy } from '../validate/evidence-policy'
import { INLINE_LINK_POLICY_PATH, loadInlineLinkPolicy } from '../validate/inline-link-policy'

interface RuleFrontmatter {
  slug?: string
  title?: string
  relatedRules?: Array<{ slug?: string; reason?: string }>
  resources?: Array<{ name?: string; title?: string; url?: string; type?: string }>
  sources?: Array<{ title?: string; url?: string; authority?: string }>
  tools?: Array<string | { name?: string; url?: string | null }>
}

interface RuleIndexEntry {
  title: string
  category: string
  slug: string
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const inline = args.find(arg => arg.startsWith(`${flag}=`))
  if (inline) {
    return inline.slice(flag.length + 1)
  }

  const index = args.indexOf(flag)
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1]
  }

  return undefined
}

function isRuleFrontmatter(value: unknown): value is RuleFrontmatter {
  return typeof value === 'object' && value !== null
}

function buildRuleIndex(files: string[]): Map<string, RuleIndexEntry[]> {
  const bySlug = new Map<string, RuleIndexEntry[]>()

  for (const filePath of files) {
    const parsed = matter.read(filePath)
    const slug = String(parsed.data.slug ?? path.basename(filePath, '.mdx'))
    const title = String(parsed.data.title ?? slug)
    const category =
      path
        .relative(path.join(process.cwd(), 'packages/content/rules/en'), filePath)
        .split(path.sep)[0] ?? 'general'

    const entries = bySlug.get(slug) ?? []
    entries.push({ title, category, slug })
    bySlug.set(slug, entries)
  }

  return bySlug
}

function buildInternalTargets(
  filePath: string,
  frontmatter: RuleFrontmatter,
  ruleIndex: Map<string, RuleIndexEntry[]>
): Array<{ title?: string; href?: string }> {
  const category =
    path
      .relative(path.join(process.cwd(), 'packages/content/rules/en'), filePath)
      .split(path.sep)[0] ?? 'general'

  return (frontmatter.relatedRules ?? []).flatMap(rule => {
    if (!rule.slug) {
      return []
    }

    const matches = ruleIndex.get(rule.slug) ?? []
    const match = matches.find(entry => entry.category === category) ?? matches[0]
    if (!match) {
      return []
    }

    return [{ title: match.title, href: `/en/rules/${match.category}/${match.slug}` }]
  })
}

async function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const explicitFiles = args.filter(arg => arg.endsWith('.mdx'))
  const category = getFlagValue(args, '--category')

  if (write) {
    console.error(
      'Write mode has been disabled. Use `pnpm report:rule-links` for suggestions and edit prose manually.'
    )
    process.exit(1)
  }

  const files = collectRuleFiles(explicitFiles).filter(filePath => {
    if (!category) return true
    return filePath.replace(/\\/g, '/').includes(`/rules/en/${category}/`)
  })

  const evidencePolicy = loadEvidencePolicy(path.join(process.cwd(), EVIDENCE_POLICY_PATH))
  const inlineLinkPolicy = loadInlineLinkPolicy(path.join(process.cwd(), INLINE_LINK_POLICY_PATH))
  const ruleIndex = buildRuleIndex(files)

  let changed = 0

  for (const filePath of files) {
    const parsed = matter.read(filePath)
    const frontmatter = isRuleFrontmatter(parsed.data) ? parsed.data : {}
    const { body } = readRuleFile(filePath)
    const analysis = analyzeRuleInlineLinks(body, {
      allowedPrimaryDomains: evidencePolicy.primaryDomains,
      knownResourceUrls: (frontmatter.resources ?? [])
        .map(resource => resource.url)
        .filter((value): value is string => Boolean(value)),
      knownSourceUrls: (frontmatter.sources ?? [])
        .map(source => source.url)
        .filter((value): value is string => Boolean(value)),
      policy: inlineLinkPolicy
    })

    if (analysis.classification !== 'too_sparse') {
      continue
    }

    const externalCandidates = buildExternalLinkCandidates({
      analysis,
      allowedPrimaryDomains: evidencePolicy.primaryDomains,
      policy: inlineLinkPolicy,
      resources: frontmatter.resources,
      sources: frontmatter.sources,
      tools: frontmatter.tools
    })
    const internalCandidates = buildInternalLinkCandidates({
      analysis,
      relatedRules: buildInternalTargets(filePath, frontmatter, ruleIndex)
    })

    if (externalCandidates.length === 0 && internalCandidates.length === 0) {
      continue
    }

    changed += 1
    console.log(path.relative(process.cwd(), filePath))
  }

  console.log(`\nWould review ${changed} sparse rule files.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
