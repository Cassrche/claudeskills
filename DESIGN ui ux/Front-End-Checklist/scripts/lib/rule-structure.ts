import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { getRuleSupportData } from './rule-support-data'

export const RULES_DIR = path.join(process.cwd(), 'packages/content/rules/en')
export const RULE_STRUCTURE_BASELINE_PATH = path.join(
  process.cwd(),
  'scripts',
  'rule-structure',
  'rule-structure-baseline.json'
)

export const REQUIRED_RULE_SECTION_TITLES = ['Code Example(s)', 'Why It Matters', 'Verification']

export const VERIFICATION_HEADING_ALIASES = [
  'Verification',
  'Testing',
  'Audit Checklist',
  'Checklist',
  'How to Verify',
  'Testing & Validation',
  'Testing and Validation',
  'Testing & Monitoring'
] as const

export const OPTIONAL_RULE_SECTION_TAXONOMY = [
  'Best Practices',
  'Common Mistakes',
  'Framework Examples',
  'Tools & Validation',
  'Thresholds',
  'Exceptions',
  'Browser Support',
  'Support Notes',
  'Standards',
  'Implementation Notes',
  'Common Patterns',
  'Accessibility Requirements',
  'Testing Tools',
  'Performance Considerations'
] as const

export type RuleStructureIssueCode =
  | 'missing-code-examples'
  | 'missing-why-it-matters'
  | 'missing-verification'
  | 'code-examples-after-why-it-matters'
  | 'why-it-matters-after-verification'
  | 'verification-not-last'
  | 'inline-metadata-prose'
  | 'deprecated-verification-heading'

export interface RuleHeading {
  text: string
  depth: number
  line: number
  column: number
  startOffset: number
}

export interface RuleStructureIssue {
  code: RuleStructureIssueCode
  message: string
}

export interface RuleStructureAnalysis {
  headings: RuleHeading[]
  issues: RuleStructureIssue[]
  deprecatedVerificationHeadings: string[]
  unknownOptionalHeadings: string[]
  canonical: boolean
}

export interface RuleContractContext {
  category: string
  slug: string
  title?: string
  subcategory?: string
  body: string
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

export interface RuleContractFeatureTypes {
  compatibilitySensitive: boolean
  measurable: boolean
  exceptionHeavy: boolean
  automationFriendly: boolean
  manualReviewImportant: boolean
  standardsSensitive: boolean
}

export interface RuleContractAnalysis {
  featureTypes: RuleContractFeatureTypes
  hasExceptionsSection: boolean
  hasBrowserSupportSection: boolean
  hasSupportNotesSection: boolean
  hasStandardsSection: boolean
  hasVisibleThresholds: boolean
  hasVerificationAutomatedChecks: boolean
  hasVerificationManualChecks: boolean
  hasVerificationSplit: boolean
  expectsExceptions: boolean
  expectsVerificationSplit: boolean
  expectsStandardsVisibility: boolean
  expectsSupportNotes: boolean
  missingRecommendations: Array<
    'exceptions' | 'verificationSplit' | 'standardsVisibility' | 'supportNotes'
  >
}

export interface RuleSectionChunk {
  heading: RuleHeading
  raw: string
}

export interface RuleStructureNormalization {
  body: string
  changed: boolean
  renamedVerificationHeadings: string[]
  movedHeadingsBeforeVerification: string[]
}

export interface RuleFileContents {
  frontmatter: string
  body: string
}

const parser = unified().use(remarkParse).use(remarkMdx)
const optionalHeadingSet = new Set(OPTIONAL_RULE_SECTION_TAXONOMY)

function extractInlineText(node: any): string {
  if (!node) return ''

  if (typeof node.value === 'string') {
    return node.value
  }

  if (Array.isArray(node.children)) {
    return node.children.map(extractInlineText).join('')
  }

  return ''
}

export function normalizeHeadingText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function isCodeExampleHeading(text: string): boolean {
  return /^Code Example(?:s)?$/i.test(normalizeHeadingText(text))
}

export function isWhyItMattersHeading(text: string): boolean {
  return /^Why It Matters$/i.test(normalizeHeadingText(text))
}

export function isExceptionsHeading(text: string): boolean {
  return /^Exceptions$/i.test(normalizeHeadingText(text))
}

export function isBrowserSupportHeading(text: string): boolean {
  return /^Browser Support$/i.test(normalizeHeadingText(text))
}

export function isSupportNotesHeading(text: string): boolean {
  return /^Support Notes$/i.test(normalizeHeadingText(text))
}

export function isStandardsHeading(text: string): boolean {
  return /^Standards$/i.test(normalizeHeadingText(text))
}

export function isVerificationHeading(text: string): boolean {
  const normalized = normalizeHeadingText(text).toLowerCase()
  return VERIFICATION_HEADING_ALIASES.some(alias => alias.toLowerCase() === normalized)
}

export function isCanonicalVerificationHeading(text: string): boolean {
  return normalizeHeadingText(text).toLowerCase() === 'verification'
}

export function isVerificationAliasHeading(text: string): boolean {
  return isVerificationHeading(text) && !isCanonicalVerificationHeading(text)
}

export function hasVerificationLikeSection(body: string): boolean {
  return extractRuleHeadings(body).some(heading => isVerificationHeading(heading.text))
}

export function expectsThresholds(
  slug: string,
  title: string,
  category: string,
  body: string
): boolean {
  if (
    /(lcp|inp|cls|ttfb|budget|size|weight|contrast|zoom|tap|target|cache|header|status|score)/i.test(
      slug
    )
  ) {
    return true
  }

  if (
    /(core web vital|largest contentful paint|interaction to next paint|cumulative layout shift|time to first byte|contrast|bundle|budget|kb|mb|px|status code|permissions-policy|cache-control)/i.test(
      `${title} ${body}`
    )
  ) {
    return true
  }

  return category === 'performance' || category === 'images'
}

export function hasVisibleThresholds(body: string): boolean {
  return /(?:<=?|>=?|<|>|≤|≥)\s*\d|\b\d+(?:\.\d+)?\s?(?:ms|s|kb|mb|px|vw|vh|%|:1)\b/i.test(body)
}

function hasInlineMetadataProse(body: string): boolean {
  const bodyWithoutCodeFences = body.replace(/```[\s\S]*?```/g, '')
  return /^(?:See also\b|Reference:)/im.test(bodyWithoutCodeFences)
}

export function collectRuleFiles(explicitFiles: string[] = []): string[] {
  if (explicitFiles.length > 0) {
    return explicitFiles.map(file => path.resolve(file))
  }

  if (!existsSync(RULES_DIR)) {
    return []
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

export function readRuleFile(filePath: string): RuleFileContents {
  const raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
  const frontmatterMatch = raw.match(/^---\n[\s\S]*?\n---\n?/)

  if (!frontmatterMatch) {
    return {
      frontmatter: '',
      body: raw
    }
  }

  return {
    frontmatter: frontmatterMatch[0],
    body: raw.slice(frontmatterMatch[0].length)
  }
}

function extractHeadings(body: string): RuleHeading[] {
  try {
    const tree = parser.parse(body)
    const headings: RuleHeading[] = []

    visit(tree as any, 'heading', (node: any) => {
      headings.push({
        text: normalizeHeadingText(extractInlineText(node)),
        depth: node.depth ?? 0,
        line: node.position?.start?.line ?? 0,
        column: node.position?.start?.column ?? 0,
        startOffset: node.position?.start?.offset ?? 0
      })
    })

    return headings
  } catch {
    const headings: RuleHeading[] = []
    const lines = body.split('\n')
    let offset = 0
    let inFence = false

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const trimmed = line.trim()
      if (trimmed.startsWith('```')) {
        inFence = !inFence
      }

      const headingMatch = !inFence ? line.match(/^(#{1,6})\s+(.*)$/) : null
      if (headingMatch) {
        headings.push({
          text: normalizeHeadingText(headingMatch[2]),
          depth: headingMatch[1].length,
          line: index + 1,
          column: 1,
          startOffset: offset
        })
      }

      offset += line.length + 1
    }

    return headings
  }
}

export function extractRuleHeadings(body: string): RuleHeading[] {
  return extractHeadings(body).filter(heading => heading.depth === 2)
}

export function extractRuleSubheadings(body: string, depth = 3): RuleHeading[] {
  return extractHeadings(body).filter(heading => heading.depth === depth)
}

export function analyzeRuleStructure(body: string): RuleStructureAnalysis {
  const headings = extractRuleHeadings(body)
  const issues: RuleStructureIssue[] = []

  const codeExampleIndex = headings.findIndex(heading => isCodeExampleHeading(heading.text))
  const whyItMattersIndex = headings.findIndex(heading => isWhyItMattersHeading(heading.text))
  const canonicalVerificationIndex = headings.findLastIndex(heading =>
    isCanonicalVerificationHeading(heading.text)
  )
  const aliasVerificationIndex =
    canonicalVerificationIndex === -1
      ? headings.findLastIndex(heading => isVerificationAliasHeading(heading.text))
      : -1
  const verificationIndex =
    canonicalVerificationIndex !== -1 ? canonicalVerificationIndex : aliasVerificationIndex

  const deprecatedVerificationHeadings =
    aliasVerificationIndex !== -1 ? [headings[aliasVerificationIndex].text] : []

  const unknownOptionalHeadings = headings
    .filter(
      heading =>
        !isCodeExampleHeading(heading.text) &&
        !isWhyItMattersHeading(heading.text) &&
        !isVerificationHeading(heading.text) &&
        !optionalHeadingSet.has(heading.text)
    )
    .map(heading => heading.text)

  if (codeExampleIndex === -1) {
    issues.push({
      code: 'missing-code-examples',
      message: 'missing `## Code Example` or `## Code Examples` section'
    })
  }

  if (whyItMattersIndex === -1) {
    issues.push({
      code: 'missing-why-it-matters',
      message: 'missing `## Why It Matters` section'
    })
  }

  if (verificationIndex === -1) {
    issues.push({
      code: 'missing-verification',
      message: 'missing `## Verification` section'
    })
  }

  if (codeExampleIndex !== -1 && whyItMattersIndex !== -1 && codeExampleIndex > whyItMattersIndex) {
    issues.push({
      code: 'code-examples-after-why-it-matters',
      message: '`## Code Example(s)` must appear before `## Why It Matters`'
    })
  }

  if (
    whyItMattersIndex !== -1 &&
    verificationIndex !== -1 &&
    whyItMattersIndex > verificationIndex
  ) {
    issues.push({
      code: 'why-it-matters-after-verification',
      message: '`## Why It Matters` must appear before `## Verification`'
    })
  }

  if (verificationIndex !== -1 && verificationIndex !== headings.length - 1) {
    issues.push({
      code: 'verification-not-last',
      message: '`## Verification` must be the final H2 section'
    })
  }

  if (deprecatedVerificationHeadings.length > 0) {
    const labels = Array.from(new Set(deprecatedVerificationHeadings)).join(', ')
    issues.push({
      code: 'deprecated-verification-heading',
      message: `deprecated verification heading alias used: ${labels}`
    })
  }

  if (hasInlineMetadataProse(body)) {
    issues.push({
      code: 'inline-metadata-prose',
      message:
        'inline metadata prose detected; keep links in natural sentences and avoid standalone `See also` or `Reference:` lines'
    })
  }

  return {
    headings,
    issues,
    deprecatedVerificationHeadings,
    unknownOptionalHeadings,
    canonical: issues.length === 0
  }
}

function getVerificationSectionRaw(body: string): string | null {
  const { sections } = extractRuleSections(body)
  const canonicalSection = sections.find(section =>
    isCanonicalVerificationHeading(section.heading.text)
  )
  if (canonicalSection) {
    return canonicalSection.raw
  }

  return sections.find(section => isVerificationAliasHeading(section.heading.text))?.raw ?? null
}

export function analyzeRuleContract(context: RuleContractContext): RuleContractAnalysis {
  const headings = extractRuleHeadings(context.body)
  const headingTexts = new Set(headings.map(heading => heading.text))
  const verificationSectionRaw = getVerificationSectionRaw(context.body)
  const verificationSubheadingTexts = new Set(
    (verificationSectionRaw ? extractRuleSubheadings(verificationSectionRaw) : []).map(heading =>
      normalizeHeadingText(heading.text).toLowerCase()
    )
  )

  const promptText = Object.values(context.prompts ?? {})
    .filter((value): value is string => Boolean(value))
    .join(' ')
  const sourceText = (context.sources ?? [])
    .map(source => `${source.title ?? ''} ${source.type ?? ''}`)
    .join(' ')
  const resourceText = (context.resources ?? [])
    .map(resource => `${resource.name ?? ''} ${resource.type ?? ''}`)
    .join(' ')
  const toolText = (context.tools ?? [])
    .map(tool => (typeof tool === 'string' ? tool : (tool.name ?? '')))
    .join(' ')
  const haystack = [
    context.category,
    context.slug,
    context.title ?? '',
    context.subcategory ?? '',
    context.body,
    promptText,
    sourceText,
    resourceText,
    toolText
  ].join(' ')

  const supportData = getRuleSupportData(context.slug)

  const featureTypes: RuleContractFeatureTypes = {
    compatibilitySensitive:
      Boolean(supportData) ||
      /(subgrid|@property|view transition|container quer|logical properties|service worker|speculation|http\/2|http2|browser support|caniuse|permissions-policy|permission policy|web app manifest|pwa|display modes|feature detection)/i.test(
        haystack
      ),
    measurable: expectsThresholds(
      context.slug,
      context.title ?? context.slug,
      context.category,
      context.body
    ),
    exceptionHeavy:
      ['accessibility', 'security', 'seo'].includes(context.category) ||
      (context.category === 'javascript' &&
        /(strict|eval|coercion|storage|security|validation|linter|promise|translation)/i.test(
          `${context.slug} ${context.subcategory ?? ''}`
        )),
    automationFriendly:
      /(eslint|stylelint|biome|axe|lighthouse|playwright|cypress|jest|vitest|ci\b|crawler|curl|validator|search console|screaming frog|webpagetest|observatory|ssllabs|pa11y|automated)/i.test(
        haystack
      ),
    manualReviewImportant:
      ['accessibility', 'css', 'html', 'images', 'seo', 'security', 'performance'].includes(
        context.category
      ) ||
      /(screen reader|keyboard|manual|visual|rendered|browser behavior|real device|assistive|page source|devtools)/i.test(
        haystack
      ),
    standardsSensitive:
      /(wcag|w3c|owasp|google search central|search essentials|core web vital|spec|standard|status code|canonical|robots|aria|contrast ratio)/i.test(
        haystack
      )
  }

  const hasExceptionsSection = [...headingTexts].some(isExceptionsHeading)
  const hasBrowserSupportSection = [...headingTexts].some(isBrowserSupportHeading)
  const hasSupportNotesSection = [...headingTexts].some(isSupportNotesHeading)
  const hasStandardsSection = [...headingTexts].some(isStandardsHeading)
  const hasVerificationAutomatedChecks = verificationSubheadingTexts.has('automated checks')
  const hasVerificationManualChecks = verificationSubheadingTexts.has('manual checks')
  const hasVerificationSplit = hasVerificationAutomatedChecks && hasVerificationManualChecks
  const hasVisibleStandardsSupport =
    hasVisibleThresholds(context.body) ||
    hasStandardsSection ||
    hasBrowserSupportSection ||
    hasSupportNotesSection

  const expectsExceptions = featureTypes.exceptionHeavy
  const expectsVerificationSplit =
    featureTypes.automationFriendly && featureTypes.manualReviewImportant
  const expectsStandardsVisibility =
    featureTypes.measurable ||
    featureTypes.compatibilitySensitive ||
    featureTypes.standardsSensitive
  const expectsSupportNotes = Boolean(supportData) || featureTypes.compatibilitySensitive

  const missingRecommendations: RuleContractAnalysis['missingRecommendations'] = []
  if (expectsExceptions && !hasExceptionsSection) {
    missingRecommendations.push('exceptions')
  }
  if (expectsVerificationSplit && !hasVerificationSplit) {
    missingRecommendations.push('verificationSplit')
  }
  if (expectsStandardsVisibility && !hasVisibleStandardsSupport) {
    missingRecommendations.push('standardsVisibility')
  }
  if (expectsSupportNotes && !(hasBrowserSupportSection || hasSupportNotesSection)) {
    missingRecommendations.push('supportNotes')
  }

  return {
    featureTypes,
    hasExceptionsSection,
    hasBrowserSupportSection,
    hasSupportNotesSection,
    hasStandardsSection,
    hasVisibleThresholds: hasVisibleThresholds(context.body),
    hasVerificationAutomatedChecks,
    hasVerificationManualChecks,
    hasVerificationSplit,
    expectsExceptions,
    expectsVerificationSplit,
    expectsStandardsVisibility,
    expectsSupportNotes,
    missingRecommendations
  }
}

export function extractRuleSections(body: string): {
  preamble: string
  sections: RuleSectionChunk[]
} {
  const headings = extractRuleHeadings(body)

  if (headings.length === 0) {
    return {
      preamble: body,
      sections: []
    }
  }

  const preamble = body.slice(0, headings[0].startOffset)
  const sections = headings.map((heading, index) => {
    const start = heading.startOffset
    const end = headings[index + 1]?.startOffset ?? body.length

    return {
      heading,
      raw: body.slice(start, end)
    }
  })

  return { preamble, sections }
}

function replaceSectionHeading(section: string, nextHeading: string): string {
  return section.replace(/^##\s+.*$/m, `## ${nextHeading}`)
}

export function normalizeRuleStructureBody(body: string): RuleStructureNormalization {
  const { preamble, sections } = extractRuleSections(body)
  let changed = false

  if (sections.length === 0) {
    return {
      body,
      changed,
      renamedVerificationHeadings: [],
      movedHeadingsBeforeVerification: []
    }
  }

  const renamedVerificationHeadings: string[] = []
  const movedHeadingsBeforeVerification: string[] = []

  const canonicalVerificationIndex = sections.findLastIndex(section =>
    isCanonicalVerificationHeading(section.heading.text)
  )
  const aliasVerificationIndex =
    canonicalVerificationIndex === -1
      ? sections.findLastIndex(section => isVerificationAliasHeading(section.heading.text))
      : -1
  const verificationIndex =
    canonicalVerificationIndex !== -1 ? canonicalVerificationIndex : aliasVerificationIndex

  const normalizedSections = sections.map((section, index) => {
    if (index !== aliasVerificationIndex) {
      return section
    }

    changed = true
    renamedVerificationHeadings.push(section.heading.text)

    return {
      ...section,
      heading: { ...section.heading, text: 'Verification' },
      raw: replaceSectionHeading(section.raw, 'Verification')
    }
  })

  if (verificationIndex !== -1 && verificationIndex < normalizedSections.length - 1) {
    const trailingSections = normalizedSections.slice(verificationIndex + 1)
    const reordered = [
      ...normalizedSections.slice(0, verificationIndex),
      ...trailingSections,
      normalizedSections[verificationIndex]
    ]

    changed = true
    movedHeadingsBeforeVerification.push(...trailingSections.map(section => section.heading.text))

    return {
      body: preamble + reordered.map(section => section.raw).join(''),
      changed,
      renamedVerificationHeadings,
      movedHeadingsBeforeVerification
    }
  }

  return {
    body: preamble + normalizedSections.map(section => section.raw).join(''),
    changed,
    renamedVerificationHeadings,
    movedHeadingsBeforeVerification
  }
}
