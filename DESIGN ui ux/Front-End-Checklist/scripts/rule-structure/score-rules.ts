/**
 * Quality scorer for Front-End Checklist rules.
 *
 * Scores each rule MDX file across multiple dimensions and outputs a ranked report.
 * Rules scoring below the minimum threshold are flagged for improvement.
 *
 * Usage:
 *   pnpm score:rules                   # score all rules, print summary
 *   pnpm score:rules --failing         # only print rules below threshold
 *   pnpm score:rules --json            # output JSON for CI or other tools
 *   pnpm score:rules --min 60          # custom minimum score (default: 50)
 *   pnpm score:rules path/to/rule.mdx  # score specific files
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import matter from 'gray-matter'
import {
  analyzeRuleContract,
  expectsThresholds,
  hasVerificationLikeSection,
  hasVisibleThresholds
} from '../lib/rule-structure'

const RULES_DIR = path.join(process.cwd(), 'packages/content/rules/en')
const DEFAULT_MIN_SCORE = 50

// Patterns that indicate a stub/generated prompt rather than a real one
const STUB_PATTERNS = [
  /^verify if the project adheres to/i,
  /^update the codebase to align with/i,
  /^explain the importance of/i,
  /^check if .+ follows best practices/i,
  /^ensure .+ is implemented correctly/i
]

interface RuleFrontmatter {
  title: string
  slug?: string
  description?: string
  aiContext?: string
  priority?: string
  difficulty?: string
  estimatedTime?: number
  whyItMatters?: string
  tldr?: string[]
  relatedRules?: { slug: string; reason: string }[]
  sources?: Array<{
    id?: string
    title?: string
    url?: string
    type?: string
    role?: string
    authority?: string
  }>
  resources?: unknown[]
  tools?: unknown[]
  prompts?: {
    check?: string
    fix?: string
    explain?: string
    codeReview?: string
  }
}

interface ScoreDimension {
  name: string
  score: number
  max: number
  note?: string
}

interface RuleScore {
  filePath: string
  category: string
  slug: string
  title: string
  total: number
  maxTotal: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  dimensions: ScoreDimension[]
}

function isStubPrompt(text: string | undefined): boolean {
  if (!text) return true
  return STUB_PATTERNS.some(p => p.test(text.trim()))
}

function gradeFromScore(score: number, max: number): RuleScore['grade'] {
  const pct = score / max
  if (pct >= 0.85) return 'A'
  if (pct >= 0.7) return 'B'
  if (pct >= 0.55) return 'C'
  if (pct >= 0.4) return 'D'
  return 'F'
}

export function scoreRule(filePath: string): RuleScore | null {
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

  const { data, content: body } = parsed
  const fm = data as RuleFrontmatter

  const category = filePath.replace(/\\/g, '/').split('/').at(-2) ?? 'unknown'
  const slug = fm.slug ?? path.basename(filePath, '.mdx')
  const codeBlockCount = (body.match(/```/g) ?? []).length / 2
  const wordCount = body.trim().split(/\s+/).length
  const verificationSection = hasVerificationLikeSection(body)
  const thresholdExpected = expectsThresholds(slug, fm.title ?? slug, category, body)
  const thresholdPresent = hasVisibleThresholds(body)
  const sourceRoles = new Set((fm.sources ?? []).map(source => source.role).filter(Boolean))
  const primarySourceCount = (fm.sources ?? []).filter(
    source => source.authority === 'primary'
  ).length
  const contract = analyzeRuleContract({
    category,
    slug,
    title: fm.title,
    body,
    sources: fm.sources,
    resources: fm.resources as Array<{ name?: string; type?: string }> | undefined,
    tools: fm.tools as Array<{ name?: string } | string> | undefined,
    prompts: fm.prompts
  })

  const dimensions: ScoreDimension[] = [
    // Prompts — 24 pts total
    {
      name: 'prompts.check',
      score: fm.prompts?.check && !isStubPrompt(fm.prompts.check) ? 8 : fm.prompts?.check ? 2 : 0,
      max: 8,
      note: !fm.prompts?.check
        ? 'missing'
        : isStubPrompt(fm.prompts.check)
          ? 'stub — needs rewriting'
          : undefined
    },
    {
      name: 'prompts.fix',
      score: fm.prompts?.fix && !isStubPrompt(fm.prompts.fix) ? 8 : fm.prompts?.fix ? 2 : 0,
      max: 8,
      note: !fm.prompts?.fix
        ? 'missing'
        : isStubPrompt(fm.prompts.fix)
          ? 'stub — needs rewriting'
          : undefined
    },
    {
      name: 'prompts.explain',
      score:
        fm.prompts?.explain && !isStubPrompt(fm.prompts.explain) ? 8 : fm.prompts?.explain ? 2 : 0,
      max: 8,
      note: !fm.prompts?.explain
        ? 'missing'
        : isStubPrompt(fm.prompts.explain)
          ? 'stub — needs rewriting'
          : undefined
    },

    // Metadata and sourcing — 34 pts total
    {
      name: 'tldr',
      score: (fm.tldr?.length ?? 0) >= 3 ? 4 : (fm.tldr?.length ?? 0) >= 1 ? 2 : 0,
      max: 4,
      note:
        (fm.tldr?.length ?? 0) === 0
          ? 'missing'
          : (fm.tldr?.length ?? 0) < 3
            ? 'fewer than 3 bullets'
            : undefined
    },
    {
      name: 'whyItMatters',
      score: fm.whyItMatters && fm.whyItMatters.length > 40 ? 4 : fm.whyItMatters ? 2 : 0,
      max: 4,
      note: !fm.whyItMatters ? 'missing' : fm.whyItMatters.length <= 40 ? 'too short' : undefined
    },
    {
      name: 'aiContext',
      score: fm.aiContext ? 6 : 0,
      max: 6,
      note: !fm.aiContext ? 'missing — add for better skill targeting' : undefined
    },
    {
      name: 'relatedRules',
      score: (fm.relatedRules?.length ?? 0) >= 2 ? 6 : (fm.relatedRules?.length ?? 0) >= 1 ? 3 : 0,
      max: 6,
      note: (fm.relatedRules?.length ?? 0) === 0 ? 'missing' : undefined
    },
    {
      name: 'sources',
      score: (fm.sources?.length ?? 0) >= 2 ? 6 : (fm.sources?.length ?? 0) >= 1 ? 3 : 0,
      max: 6,
      note:
        (fm.sources?.length ?? 0) === 0
          ? 'missing — add authoritative references'
          : (fm.sources?.length ?? 0) < 2
            ? 'only 1 authoritative source'
            : undefined
    },
    {
      name: 'sourceQuality',
      score: sourceRoles.size >= 2 && primarySourceCount >= 1 ? 4 : sourceRoles.size >= 1 ? 2 : 0,
      max: 4,
      note:
        sourceRoles.size < 2 || primarySourceCount < 1
          ? 'add role diversity and at least one primary source'
          : undefined
    },
    {
      name: 'resourcesOrTools',
      score:
        (fm.resources?.length ?? 0) + (fm.tools?.length ?? 0) >= 2
          ? 6
          : (fm.resources?.length ?? 0) + (fm.tools?.length ?? 0) >= 1
            ? 3
            : 0,
      max: 6,
      note:
        (fm.resources?.length ?? 0) + (fm.tools?.length ?? 0) === 0
          ? 'no resources or tools'
          : undefined
    },
    {
      name: 'prompts.codeReview',
      score: fm.prompts?.codeReview && !isStubPrompt(fm.prompts.codeReview) ? 6 : 0,
      max: 6,
      note: !fm.prompts?.codeReview ? 'missing — recommended for technical rules' : undefined
    },

    // Body content — 34 pts total
    {
      name: 'codeExamples',
      score: codeBlockCount >= 3 ? 10 : codeBlockCount >= 2 ? 7 : codeBlockCount >= 1 ? 4 : 0,
      max: 10,
      note:
        codeBlockCount === 0
          ? 'no code examples'
          : codeBlockCount < 3
            ? `only ${codeBlockCount} example${codeBlockCount === 1 ? '' : 's'}`
            : undefined
    },
    {
      name: 'bodyDepth',
      score: wordCount >= 300 ? 10 : wordCount >= 150 ? 6 : wordCount >= 60 ? 3 : 0,
      max: 10,
      note:
        wordCount < 60
          ? `stub body (${wordCount} words)`
          : wordCount < 150
            ? `thin body (${wordCount} words)`
            : undefined
    },
    {
      name: 'verification',
      score: verificationSection ? 8 : 0,
      max: 8,
      note: !verificationSection ? 'missing verification/testing/checklist section' : undefined
    },
    {
      name: 'thresholds',
      score: !thresholdExpected || thresholdPresent ? 6 : 0,
      max: 6,
      note:
        thresholdExpected && !thresholdPresent
          ? 'missing explicit threshold or pass/fail criteria'
          : undefined
    },
    {
      name: 'exceptions',
      score: contract.expectsExceptions ? (contract.hasExceptionsSection ? 4 : 0) : 0,
      max: contract.expectsExceptions ? 4 : 0,
      note:
        contract.expectsExceptions && !contract.hasExceptionsSection
          ? 'recommended for nuanced or false-positive-prone rules'
          : undefined
    },
    {
      name: 'verificationSplit',
      score: contract.expectsVerificationSplit ? (contract.hasVerificationSplit ? 4 : 0) : 0,
      max: contract.expectsVerificationSplit ? 4 : 0,
      note:
        contract.expectsVerificationSplit && !contract.hasVerificationSplit
          ? 'split Verification into Automated Checks and Manual Checks'
          : undefined
    },
    {
      name: 'standardsVisibility',
      score:
        contract.expectsStandardsVisibility &&
        (contract.hasVisibleThresholds ||
          contract.hasStandardsSection ||
          contract.hasBrowserSupportSection ||
          contract.hasSupportNotesSection)
          ? 4
          : 0,
      max: contract.expectsStandardsVisibility ? 4 : 0,
      note:
        contract.expectsStandardsVisibility &&
        !(
          contract.hasVisibleThresholds ||
          contract.hasStandardsSection ||
          contract.hasBrowserSupportSection ||
          contract.hasSupportNotesSection
        )
          ? 'add a visible threshold, standards note, or support note'
          : undefined
    }
  ]

  const total = dimensions.reduce((s, d) => s + d.score, 0)
  const maxTotal = dimensions.reduce((s, d) => s + d.max, 0)

  return {
    filePath,
    category,
    slug,
    title: fm.title ?? slug,
    total,
    maxTotal,
    grade: gradeFromScore(total, maxTotal),
    dimensions
  }
}

function printReport(scores: RuleScore[], minScore: number, failingOnly: boolean) {
  const sorted = [...scores].sort((a, b) => a.total - b.total)
  const shown = failingOnly ? sorted.filter(s => s.total < minScore) : sorted

  const passing = scores.filter(s => s.total >= minScore).length
  const failing = scores.length - passing
  const avgPct = Math.round(
    (scores.reduce((s, r) => s + r.total / r.maxTotal, 0) / Math.max(scores.length, 1)) * 100
  )
  const byGrade = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  for (const s of scores) byGrade[s.grade]++

  console.log('\n══════════════════════════════════════════════════')
  console.log('  FRONTEND CHECKLIST — RULE QUALITY REPORT')
  console.log('══════════════════════════════════════════════════')
  console.log(`  Rules scored : ${scores.length}`)
  console.log(`  Average score: ${avgPct}%`)
  console.log(`  Passing (≥${minScore}): ${passing}  Failing: ${failing}`)
  console.log(
    `  Grades       : A=${byGrade.A} B=${byGrade.B} C=${byGrade.C} D=${byGrade.D} F=${byGrade.F}`
  )
  console.log('══════════════════════════════════════════════════\n')

  if (shown.length === 0) {
    console.log('  ✓ All rules meet the minimum score threshold.\n')
    return
  }

  for (const rule of shown) {
    const bar = '█'.repeat(Math.round((rule.total / rule.maxTotal) * 20)).padEnd(20, '░')
    console.log(`[${rule.grade}] ${rule.slug.padEnd(40)} ${rule.total}/${rule.maxTotal} ${bar}`)

    const issues = rule.dimensions.filter(d => d.note)
    for (const dim of issues) {
      console.log(`    · ${dim.name}: ${dim.note}`)
    }
  }

  if (failing > 0) {
    console.log(
      `\n  ${failing} rule${failing === 1 ? '' : 's'} below minimum score of ${minScore}.`
    )
  }
}

async function main() {
  const args = process.argv.slice(2)
  const failingOnly = args.includes('--failing')
  const jsonMode = args.includes('--json')
  const minArg = args.find(a => a.startsWith('--min=') || a === '--min')
  const minScore = minArg
    ? parseInt(
        args[args.indexOf('--min') + 1] ?? minArg.split('=')[1] ?? String(DEFAULT_MIN_SCORE),
        10
      )
    : DEFAULT_MIN_SCORE

  const files = args.filter(a => a.endsWith('.mdx'))

  const toScore: Array<{ path: string }> = []

  if (files.length > 0) {
    for (const f of files) toScore.push({ path: path.resolve(f) })
  } else {
    const categories = readdirSync(RULES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const cat of categories) {
      const catDir = path.join(RULES_DIR, cat)
      for (const file of readdirSync(catDir).filter(f => f.endsWith('.mdx'))) {
        toScore.push({ path: path.join(catDir, file) })
      }
    }
  }

  const scores = toScore.map(f => scoreRule(f.path)).filter((s): s is RuleScore => s !== null)

  if (jsonMode) {
    console.log(JSON.stringify(scores, null, 2))
    return
  }

  printReport(scores, minScore, failingOnly)

  // Exit 1 if any scored files are below threshold (useful for CI on specific files)
  if (files.length > 0 && scores.some(s => s.total < minScore)) {
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
