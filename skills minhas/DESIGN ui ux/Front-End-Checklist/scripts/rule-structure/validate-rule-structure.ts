/**
 * Validates Front-End Checklist rule body structure.
 *
 * Usage:
 *   pnpm validate:rule-structure
 *   pnpm validate:rule-structure --report
 *   pnpm validate:rule-structure --json
 *   pnpm validate:rule-structure path/to/rule.mdx
 *   pnpm validate:rule-structure --write-baseline
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import {
  analyzeRuleContract,
  analyzeRuleStructure,
  collectRuleFiles,
  OPTIONAL_RULE_SECTION_TAXONOMY,
  RULE_STRUCTURE_BASELINE_PATH,
  type RuleContractAnalysis,
  readRuleFile
} from '../lib/rule-structure'

interface ValidationResult {
  filePath: string
  relativePath: string
  category: string
  issues: ReturnType<typeof analyzeRuleStructure>['issues']
  deprecatedVerificationHeadings: string[]
  unknownOptionalHeadings: string[]
  canonical: boolean
  contract: RuleContractAnalysis
}

interface BaselineManifest {
  version: 1
  generatedAt: string
  files: Record<string, string[]>
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

function buildResults(files: string[]): ValidationResult[] {
  return files.map(filePath => {
    const raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
    const parsed = matter(raw)
    const { body } = readRuleFile(filePath)
    const analysis = analyzeRuleStructure(body)
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
    const frontmatter = parsed.data as {
      slug?: string
      title?: string
      subcategory?: string
      sources?: Array<{ title?: string; type?: string }>
      resources?: Array<{ name?: string; type?: string }>
      tools?: Array<{ name?: string } | string>
      prompts?: {
        check?: string
        fix?: string
        explain?: string
        codeReview?: string
      }
    }

    return {
      filePath,
      relativePath,
      category: relativePath.split('/').at(-2) ?? 'unknown',
      issues: analysis.issues,
      deprecatedVerificationHeadings: analysis.deprecatedVerificationHeadings,
      unknownOptionalHeadings: analysis.unknownOptionalHeadings,
      canonical: analysis.canonical,
      contract: analyzeRuleContract({
        category: relativePath.split('/').at(-2) ?? 'unknown',
        slug: frontmatter.slug ?? path.basename(filePath, '.mdx'),
        title: frontmatter.title,
        subcategory: frontmatter.subcategory,
        body,
        sources: frontmatter.sources,
        resources: frontmatter.resources,
        tools: frontmatter.tools,
        prompts: frontmatter.prompts
      })
    }
  })
}

function loadBaseline(baselinePath: string): BaselineManifest | null {
  if (!existsSync(baselinePath)) {
    return null
  }

  return JSON.parse(readFileSync(baselinePath, 'utf-8')) as BaselineManifest
}

function writeBaseline(baselinePath: string, results: ValidationResult[]) {
  const files = Object.fromEntries(
    results
      .filter(result => result.issues.length > 0)
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      .map(result => [result.relativePath, result.issues.map(issue => issue.code)])
  )

  const payload: BaselineManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    files
  }

  writeFileSync(`${baselinePath}`, `${JSON.stringify(payload, null, 2)}\n`)
}

function buildReport(results: ValidationResult[]) {
  const featureTypes = {
    compatibilitySensitive: 0,
    measurable: 0,
    exceptionHeavy: 0,
    automationFriendly: 0,
    manualReviewImportant: 0,
    standardsSensitive: 0
  }
  const contractSummary = {
    expectsExceptions: 0,
    missingExceptions: 0,
    expectsVerificationSplit: 0,
    missingVerificationSplit: 0,
    expectsStandardsVisibility: 0,
    missingStandardsVisibility: 0,
    expectsSupportNotes: 0,
    missingSupportNotes: 0
  }
  const byCategory: Record<
    string,
    {
      total: number
      canonical: number
      aliasUsage: number
      nonTerminalVerification: number
      unknownOptionalHeadings: Record<string, number>
      contract: {
        expectsExceptions: number
        missingExceptions: number
        expectsVerificationSplit: number
        missingVerificationSplit: number
        expectsStandardsVisibility: number
        missingStandardsVisibility: number
        expectsSupportNotes: number
        missingSupportNotes: number
      }
    }
  > = {}

  for (const result of results) {
    const category = byCategory[result.category] ?? {
      total: 0,
      canonical: 0,
      aliasUsage: 0,
      nonTerminalVerification: 0,
      unknownOptionalHeadings: {},
      contract: {
        expectsExceptions: 0,
        missingExceptions: 0,
        expectsVerificationSplit: 0,
        missingVerificationSplit: 0,
        expectsStandardsVisibility: 0,
        missingStandardsVisibility: 0,
        expectsSupportNotes: 0,
        missingSupportNotes: 0
      }
    }

    category.total += 1
    if (result.canonical) {
      category.canonical += 1
    }
    if (result.deprecatedVerificationHeadings.length > 0) {
      category.aliasUsage += 1
    }
    if (result.issues.some(issue => issue.code === 'verification-not-last')) {
      category.nonTerminalVerification += 1
    }
    for (const heading of result.unknownOptionalHeadings) {
      category.unknownOptionalHeadings[heading] =
        (category.unknownOptionalHeadings[heading] ?? 0) + 1
    }
    if (result.contract.expectsExceptions) {
      category.contract.expectsExceptions += 1
    }
    if (result.contract.missingRecommendations.includes('exceptions')) {
      category.contract.missingExceptions += 1
    }
    if (result.contract.expectsVerificationSplit) {
      category.contract.expectsVerificationSplit += 1
    }
    if (result.contract.missingRecommendations.includes('verificationSplit')) {
      category.contract.missingVerificationSplit += 1
    }
    if (result.contract.expectsStandardsVisibility) {
      category.contract.expectsStandardsVisibility += 1
    }
    if (result.contract.missingRecommendations.includes('standardsVisibility')) {
      category.contract.missingStandardsVisibility += 1
    }
    if (result.contract.expectsSupportNotes) {
      category.contract.expectsSupportNotes += 1
    }
    if (result.contract.missingRecommendations.includes('supportNotes')) {
      category.contract.missingSupportNotes += 1
    }

    for (const [key, value] of Object.entries(result.contract.featureTypes)) {
      if (value) {
        featureTypes[key as keyof typeof featureTypes] += 1
      }
    }
    if (result.contract.expectsExceptions) contractSummary.expectsExceptions += 1
    if (result.contract.missingRecommendations.includes('exceptions'))
      contractSummary.missingExceptions += 1
    if (result.contract.expectsVerificationSplit) contractSummary.expectsVerificationSplit += 1
    if (result.contract.missingRecommendations.includes('verificationSplit')) {
      contractSummary.missingVerificationSplit += 1
    }
    if (result.contract.expectsStandardsVisibility) contractSummary.expectsStandardsVisibility += 1
    if (result.contract.missingRecommendations.includes('standardsVisibility')) {
      contractSummary.missingStandardsVisibility += 1
    }
    if (result.contract.expectsSupportNotes) contractSummary.expectsSupportNotes += 1
    if (result.contract.missingRecommendations.includes('supportNotes')) {
      contractSummary.missingSupportNotes += 1
    }

    byCategory[result.category] = category
  }

  return {
    totalRules: results.length,
    optionalHeadingTaxonomy: [...OPTIONAL_RULE_SECTION_TAXONOMY],
    featureTypes,
    contractSummary,
    migrationBatches: {
      batch1: {
        label: 'Exceptions',
        categories: ['security', 'accessibility', 'seo', 'javascript'],
        total:
          (byCategory.security?.contract.missingExceptions ?? 0) +
          (byCategory.accessibility?.contract.missingExceptions ?? 0) +
          (byCategory.seo?.contract.missingExceptions ?? 0) +
          (byCategory.javascript?.contract.missingExceptions ?? 0)
      },
      batch2: {
        label: 'Verification Split',
        categories: ['seo', 'performance', 'accessibility', 'security'],
        total:
          (byCategory.seo?.contract.missingVerificationSplit ?? 0) +
          (byCategory.performance?.contract.missingVerificationSplit ?? 0) +
          (byCategory.accessibility?.contract.missingVerificationSplit ?? 0) +
          (byCategory.security?.contract.missingVerificationSplit ?? 0)
      },
      batch3: {
        label: 'Support Notes',
        categories: ['css', 'html', 'performance', 'security'],
        total:
          (byCategory.css?.contract.missingSupportNotes ?? 0) +
          (byCategory.html?.contract.missingSupportNotes ?? 0) +
          (byCategory.performance?.contract.missingSupportNotes ?? 0) +
          (byCategory.security?.contract.missingSupportNotes ?? 0)
      }
    },
    byCategory
  }
}

function printValidationResults(
  results: ValidationResult[],
  baseline: BaselineManifest | null,
  strictFiles: boolean,
  baselinePath: string | null
): number {
  const unexpected: Array<{ result: ValidationResult; codes: string[] }> = []
  const resolvedBaselineEntries: string[] = []

  const baselineFiles = baseline?.files ?? {}

  for (const result of results) {
    const allowedCodes = strictFiles ? [] : (baselineFiles[result.relativePath] ?? [])
    const allowed = new Set(allowedCodes)
    const unexpectedCodes = result.issues
      .map(issue => issue.code)
      .filter(code => !allowed.has(code))

    if (unexpectedCodes.length > 0) {
      unexpected.push({ result, codes: unexpectedCodes })
    }

    if (!strictFiles && allowedCodes.length > 0 && result.issues.length === 0) {
      resolvedBaselineEntries.push(result.relativePath)
    }
  }

  if (!strictFiles) {
    for (const relativePath of Object.keys(baselineFiles)) {
      if (!results.some(result => result.relativePath === relativePath)) {
        resolvedBaselineEntries.push(relativePath)
      }
    }
  }

  const rulesWithIssues = results.filter(result => result.issues.length > 0).length
  const rulesWithUnknownOptionalHeadings = results.filter(
    result => result.unknownOptionalHeadings.length > 0
  ).length

  console.log('\n══════════════════════════════════════════════════')
  console.log('  RULE STRUCTURE REPORT')
  console.log('══════════════════════════════════════════════════')
  console.log(`  Rules checked           : ${results.length}`)
  console.log(`  Rules with errors       : ${rulesWithIssues}`)
  console.log(`  Rules with new errors   : ${unexpected.length}`)
  console.log(`  Unknown optional headings: ${rulesWithUnknownOptionalHeadings}`)
  if (!strictFiles && baseline && baselinePath) {
    console.log(`  Baseline path           : ${path.relative(process.cwd(), baselinePath)}`)
    console.log(`  Resolved baseline items : ${resolvedBaselineEntries.length}`)
  }
  console.log('══════════════════════════════════════════════════\n')

  for (const { result, codes } of unexpected) {
    console.log(`[!] ${result.relativePath}`)
    for (const issue of result.issues.filter(entry => codes.includes(entry.code))) {
      console.log(`    · ${issue.message}`)
    }
  }

  if (unexpected.length === 0) {
    console.log('  ✓ Rule structure matches the current enforcement contract.\n')
  }

  if (resolvedBaselineEntries.length > 0) {
    console.log('Resolved baseline entries:')
    for (const relativePath of resolvedBaselineEntries.sort()) {
      console.log(`  · ${relativePath}`)
    }
    console.log('')
  }

  if (rulesWithUnknownOptionalHeadings > 0) {
    console.log('Unknown optional headings are reported but do not fail validation.')
    console.log('Run `pnpm validate:rule-structure --report` to inspect category drift.\n')
  }

  return unexpected.length
}

async function main() {
  const args = process.argv.slice(2)
  const jsonMode = args.includes('--json')
  const reportMode = args.includes('--report')
  const writeBaselineFlag = args.includes('--write-baseline')
  const explicitFiles = args.filter(arg => arg.endsWith('.mdx'))
  const baselineArg = getFlagValue(args, '--baseline')
  const baselinePath = baselineArg
    ? path.resolve(baselineArg)
    : explicitFiles.length === 0
      ? RULE_STRUCTURE_BASELINE_PATH
      : null

  const files = collectRuleFiles(explicitFiles)
  const results = buildResults(files)

  if (writeBaselineFlag) {
    const outputPath = baselinePath ?? RULE_STRUCTURE_BASELINE_PATH
    writeBaseline(outputPath, results)
    console.log(`Wrote rule structure baseline to ${path.relative(process.cwd(), outputPath)}`)
    return
  }

  if (reportMode) {
    const report = buildReport(results)
    if (jsonMode) {
      console.log(JSON.stringify(report, null, 2))
      return
    }

    console.log('\nRule structure report:\n')
    console.log(
      `Feature types: compatibility ${report.featureTypes.compatibilitySensitive}, measurable ${report.featureTypes.measurable}, exception-heavy ${report.featureTypes.exceptionHeavy}, automation-friendly ${report.featureTypes.automationFriendly}, manual-review ${report.featureTypes.manualReviewImportant}, standards-sensitive ${report.featureTypes.standardsSensitive}`
    )
    console.log(
      `V2 gaps: exceptions ${report.contractSummary.missingExceptions}/${report.contractSummary.expectsExceptions}, verification split ${report.contractSummary.missingVerificationSplit}/${report.contractSummary.expectsVerificationSplit}, standards/support ${report.contractSummary.missingStandardsVisibility}/${report.contractSummary.expectsStandardsVisibility}, support notes ${report.contractSummary.missingSupportNotes}/${report.contractSummary.expectsSupportNotes}\n`
    )
    console.log(
      `Migration batches: batch1 ${report.migrationBatches.batch1.total} (${report.migrationBatches.batch1.categories.join(', ')}), batch2 ${report.migrationBatches.batch2.total} (${report.migrationBatches.batch2.categories.join(', ')}), batch3 ${report.migrationBatches.batch3.total} (${report.migrationBatches.batch3.categories.join(', ')})\n`
    )
    console.log('By category:\n')
    for (const [category, stats] of Object.entries(report.byCategory).sort((a, b) =>
      a[0].localeCompare(b[0])
    )) {
      console.log(
        `- ${category}: ${stats.canonical}/${stats.total} canonical-url, ${stats.aliasUsage} alias use, ${stats.nonTerminalVerification} non-terminal verification`
      )
      console.log(
        `  V2 gaps: exceptions ${stats.contract.missingExceptions}/${stats.contract.expectsExceptions}, verification split ${stats.contract.missingVerificationSplit}/${stats.contract.expectsVerificationSplit}, standards/support ${stats.contract.missingStandardsVisibility}/${stats.contract.expectsStandardsVisibility}, support notes ${stats.contract.missingSupportNotes}/${stats.contract.expectsSupportNotes}`
      )

      const unknownHeadings = Object.entries(stats.unknownOptionalHeadings)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)

      if (unknownHeadings.length > 0) {
        console.log(
          `  unknown headings: ${unknownHeadings.map(([heading, count]) => `${heading} (${count})`).join(', ')}`
        )
      }
    }
    console.log('')
    return
  }

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2))
    return
  }

  const baseline = baselinePath ? loadBaseline(baselinePath) : null
  const strictFiles = explicitFiles.length > 0
  const unexpectedCount = printValidationResults(results, baseline, strictFiles, baselinePath)

  if (unexpectedCount > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
