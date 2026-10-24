/**
 * Review inline-link density and candidate link targets across rule MDX files.
 *
 * Usage:
 *   pnpm report:rule-links
 *   pnpm report:rule-links --category=seo
 *   pnpm report:rule-links --json
 *   pnpm report:rule-links packages/content/rules/en/performance/import-on-visibility.mdx
 */

import path from 'node:path'
import { pathToFileURL } from 'node:url'
import matter from 'gray-matter'
import {
  analyzeRuleInlineLinks,
  buildExternalLinkCandidates,
  buildInternalLinkCandidates,
  type CandidateLink,
  type InlineLinkAnalysis
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

interface RuleLinkReport {
  filePath: string
  relativePath: string
  category: string
  title: string
  slug: string
  classification: InlineLinkAnalysis['classification']
  totalLinkCount: number
  externalLinkCount: number
  internalRuleLinkCount: number
  citationHeavySectionsWithoutLinks: string[]
  warnings: InlineLinkAnalysis['warnings']
  candidateExternalLinks: CandidateLink[]
  candidateInternalLinks: CandidateLink[]
}

function isRuleFrontmatter(value: unknown): value is RuleFrontmatter {
  return typeof value === 'object' && value !== null
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

function buildReportResults(files: string[]): RuleLinkReport[] {
  const evidencePolicy = loadEvidencePolicy(path.join(process.cwd(), EVIDENCE_POLICY_PATH))
  const inlineLinkPolicy = loadInlineLinkPolicy(path.join(process.cwd(), INLINE_LINK_POLICY_PATH))
  const ruleIndex = buildRuleIndex(files)

  return files.map(filePath => {
    const { body } = readRuleFile(filePath)
    const parsed = matter.read(filePath)
    const frontmatter = isRuleFrontmatter(parsed.data) ? parsed.data : {}
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
    const category = relativePath.split('/').at(-2) ?? 'unknown'
    const slug = frontmatter.slug ?? path.basename(filePath, '.mdx')
    const title = frontmatter.title ?? slug
    const analysis = analyzeRuleInlineLinks(body, {
      allowedPrimaryDomains: evidencePolicy.primaryDomains,
      knownResourceUrls: (frontmatter.resources ?? [])
        .map(resource => resource.url)
        .filter(Boolean),
      knownSourceUrls: (frontmatter.sources ?? []).map(source => source.url).filter(Boolean),
      policy: inlineLinkPolicy
    })

    return {
      filePath,
      relativePath,
      category,
      title,
      slug,
      classification: analysis.classification,
      totalLinkCount: analysis.totalLinkCount,
      externalLinkCount: analysis.externalLinkCount,
      internalRuleLinkCount: analysis.internalRuleLinkCount,
      citationHeavySectionsWithoutLinks: analysis.citationHeavySectionsWithoutLinks,
      warnings: analysis.warnings,
      candidateExternalLinks: buildExternalLinkCandidates({
        analysis,
        allowedPrimaryDomains: evidencePolicy.primaryDomains,
        policy: inlineLinkPolicy,
        resources: frontmatter.resources,
        sources: frontmatter.sources,
        tools: frontmatter.tools
      }),
      candidateInternalLinks: buildInternalLinkCandidates({
        analysis,
        relatedRules: buildInternalTargets(filePath, frontmatter, ruleIndex)
      })
    }
  })
}

function printCategorySummary(results: RuleLinkReport[]) {
  const byCategory = new Map<
    string,
    {
      total: number
      sparse: number
      balanced: number
      dense: number
      totalLinks: number
    }
  >()

  for (const result of results) {
    const summary = byCategory.get(result.category) ?? {
      total: 0,
      sparse: 0,
      balanced: 0,
      dense: 0,
      totalLinks: 0
    }

    summary.total += 1
    summary.totalLinks += result.totalLinkCount
    if (result.classification === 'too_sparse') summary.sparse += 1
    if (result.classification === 'balanced') summary.balanced += 1
    if (result.classification === 'too_dense') summary.dense += 1

    byCategory.set(result.category, summary)
  }

  console.log('\nCategory summary\n')
  for (const [category, summary] of Array.from(byCategory.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const averageLinks = (summary.totalLinks / summary.total).toFixed(2)
    console.log(
      `- ${category}: ${summary.total} rules | sparse ${summary.sparse} | balanced ${summary.balanced} | dense ${summary.dense} | avg ${averageLinks} links`
    )
  }
}

function printRuleDetails(results: RuleLinkReport[], includeBalanced: boolean) {
  const filtered = includeBalanced
    ? results
    : results.filter(result => result.classification !== 'balanced' || result.warnings.length > 0)

  if (filtered.length === 0) {
    console.log('\nAll reviewed rules look balanced under the current heuristics.\n')
    return
  }

  console.log('\nRule review\n')
  for (const result of filtered) {
    console.log(`- ${result.relativePath} [${result.classification}]`)
    console.log(
      `  links: ${result.totalLinkCount} total (${result.externalLinkCount} external, ${result.internalRuleLinkCount} internal)`
    )

    if (result.citationHeavySectionsWithoutLinks.length > 0) {
      console.log(
        `  claim-heavy sections without inline links: ${result.citationHeavySectionsWithoutLinks.join(', ')}`
      )
    }

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        const location = warning.section
          ? ` (${warning.section}${warning.line ? `:${warning.line}` : ''})`
          : ''
        console.log(`  warning: ${warning.message}${location}`)
      }
    }

    if (result.candidateInternalLinks.length > 0) {
      console.log(
        `  internal candidates: ${result.candidateInternalLinks
          .map(candidate => `${candidate.label} -> ${candidate.href}`)
          .join('; ')}`
      )
    }

    if (result.candidateExternalLinks.length > 0) {
      console.log(
        `  external candidates: ${result.candidateExternalLinks
          .map(candidate => `${candidate.label} -> ${candidate.href}`)
          .join('; ')}`
      )
    }
  }
}

/**
 * Run the inline-link report CLI.
 *
 * @param args - Optional CLI args. Defaults to `process.argv.slice(2)`.
 */
export async function runReportRuleLinks(args = process.argv.slice(2)) {
  const explicitFiles = args.filter(arg => arg.endsWith('.mdx'))
  const category = getFlagValue(args, '--category')
  const json = args.includes('--json')
  const includeBalanced = explicitFiles.length > 0 || args.includes('--include-balanced')
  const files = collectRuleFiles(explicitFiles).filter(filePath => {
    if (!category) {
      return true
    }

    return filePath.replace(/\\/g, '/').includes(`/rules/en/${category}/`)
  })

  const results = buildReportResults(files)

  if (json) {
    console.log(JSON.stringify({ rulesChecked: results.length, results }, null, 2))
    return
  }

  console.log(`\nInline link review for ${results.length} rule files.`)
  printCategorySummary(results)
  printRuleDetails(results, includeBalanced)
  console.log(
    '\nHeuristics are report-only. Use this output to review batches, not to auto-insert links.\n'
  )
}

const entryPath = process.argv[1]
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  runReportRuleLinks().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
