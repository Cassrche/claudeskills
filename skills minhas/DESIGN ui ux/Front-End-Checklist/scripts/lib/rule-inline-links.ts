import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { type InlineLinkPolicy, isTrustedSecondaryUrl } from '../validate/inline-link-policy'

export type InlineLinkClassification = 'too_sparse' | 'balanced' | 'too_dense'

export interface InlineLinkRecord {
  text: string
  href: string
  kind: 'internalRule' | 'external' | 'other'
  section: string
  line: number
}

export interface InlineLinkParagraph {
  text: string
  section: string
  line: number
  links: InlineLinkRecord[]
  rawUrls: string[]
  repeatedHrefs: string[]
}

export interface InlineLinkSection {
  title: string
  paragraphCount: number
  wordCount: number
  linkCount: number
  externalLinkCount: number
  internalRuleLinkCount: number
  claimSignalCount: number
}

export interface InlineLinkWarning {
  code:
    | 'formulaic-metadata-prose'
    | 'claim-heavy-section-without-links'
    | 'repeated-destinations-in-paragraph'
    | 'raw-urls-in-prose'
    | 'internal-link-overuse'
    | 'unsupported-external-link'
  message: string
  section?: string
  line?: number
}

export interface CandidateLink {
  label: string
  href: string
  reason: string
  kind: 'internal' | 'source' | 'secondary'
}

export interface InlineLinkAnalysis {
  classification: InlineLinkClassification
  totalLinkCount: number
  externalLinkCount: number
  internalRuleLinkCount: number
  otherLinkCount: number
  wordCount: number
  paragraphs: InlineLinkParagraph[]
  sections: InlineLinkSection[]
  citationHeavySectionsWithoutLinks: string[]
  warnings: InlineLinkWarning[]
}

export interface InlineLinkAnalysisOptions {
  allowedPrimaryDomains?: Iterable<string>
  knownResourceUrls?: Iterable<string>
  knownSourceUrls?: Iterable<string>
  policy?: InlineLinkPolicy
}

export interface ExternalLinkCandidateInput {
  analysis: InlineLinkAnalysis
  allowedPrimaryDomains?: Iterable<string>
  policy?: InlineLinkPolicy
  resources?: Array<{ name?: string; title?: string; url?: string; type?: string }>
  sources?: Array<{ title?: string; url?: string; authority?: string }>
  tools?: Array<string | { name?: string; url?: string | null }>
}

export interface InternalLinkCandidateInput {
  analysis: InlineLinkAnalysis
  relatedRules?: Array<{ title?: string; href?: string }>
}

const parser = unified().use(remarkParse).use(remarkMdx)
const INTRO_SECTION_TITLE = 'Intro'
const RAW_URL_PATTERN = /(^|[\s(])https?:\/\/[^\s)]+/gi

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getType(node: unknown): string {
  if (!isRecord(node)) return ''

  const value = Reflect.get(node, 'type')
  return typeof value === 'string' ? value : ''
}

function getChildren(node: unknown): unknown[] {
  if (!isRecord(node)) return []

  const value = Reflect.get(node, 'children')
  return Array.isArray(value) ? value : []
}

function getStringField(node: unknown, key: string): string | undefined {
  if (!isRecord(node)) return undefined

  const value = Reflect.get(node, key)
  return typeof value === 'string' ? value : undefined
}

function getPositionLine(node: unknown): number {
  if (!isRecord(node)) return 0

  const position = Reflect.get(node, 'position')
  if (!isRecord(position)) return 0

  const start = Reflect.get(position, 'start')
  if (!isRecord(start)) return 0

  const line = Reflect.get(start, 'line')
  return typeof line === 'number' ? line : 0
}

function extractInlineText(node: unknown): string {
  const directValue = getStringField(node, 'value')
  if (directValue) {
    return directValue
  }

  return getChildren(node).map(extractInlineText).join('')
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function countWords(text: string): number {
  const matches = normalizeText(text).match(/\b[\w/-]+\b/g)
  return matches?.length ?? 0
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

function isInternalRuleHref(href: string): boolean {
  return /^\/(?:[a-z]{2}\/)?rules\/[a-z0-9-]+\/[a-z0-9-]+$/i.test(href)
}

function detectFormulaicMetadataParagraph(text: string): boolean {
  const normalized = normalizeText(text)
  return /^(see also\b|reference:)/i.test(normalized)
}

function countClaimSignals(text: string): number {
  let score = 0

  if (
    /\b(wcag|w3c|mdn|google|spec|standard|browser|support|compatibility|baseline)\b/i.test(text)
  ) {
    score += 1
  }
  if (/\b(should|must|recommended|requires?|confirm|verify|ensure|avoid)\b/i.test(text)) {
    score += 1
  }
  if (/(?:<=?|>=?|<|>|≤|≥)\s*\d|\b\d+(?:\.\d+)?\s?(?:ms|s|kb|mb|px|%|:1)\b/i.test(text)) {
    score += 1
  }
  if (text.length >= 320) {
    score += 1
  }

  return score
}

function collectNodesByType(node: unknown, type: string, matches: unknown[] = []): unknown[] {
  if (getType(node) === type) {
    matches.push(node)
  }

  for (const child of getChildren(node)) {
    collectNodesByType(child, type, matches)
  }

  return matches
}

function normalizeHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function isAllowedPrimaryDomain(url: string, allowedPrimaryDomains: Set<string>): boolean {
  const hostname = normalizeHostname(url)

  for (const domain of allowedPrimaryDomains) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return true
    }
  }

  return false
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function paragraphMentionsLabel(paragraphText: string, label: string): boolean {
  const normalizedLabel = normalizeText(label)
  if (normalizedLabel.length < 3) {
    return false
  }

  return new RegExp(`\\b${escapeRegExp(normalizedLabel)}\\b`, 'i').test(paragraphText)
}

function hasUnlinkedNamedMention(
  analysis: InlineLinkAnalysis,
  label: string,
  href: string
): boolean {
  return analysis.paragraphs.some(paragraph => {
    if (!paragraphMentionsLabel(paragraph.text, label)) {
      return false
    }

    return !paragraph.links.some(link => link.href === href)
  })
}

function classifyHref(href: string): InlineLinkRecord['kind'] {
  if (isInternalRuleHref(href)) {
    return 'internalRule'
  }
  if (isExternalHref(href)) {
    return 'external'
  }
  return 'other'
}

function buildParagraph(section: string, paragraphNode: unknown): InlineLinkParagraph {
  const text = normalizeText(extractInlineText(paragraphNode))
  const rawUrls = Array.from(text.matchAll(RAW_URL_PATTERN), match => match[0].trim())
  const links = collectNodesByType(paragraphNode, 'link').flatMap(node => {
    const href = getStringField(node, 'url')
    if (!href) return []

    return [
      {
        text: normalizeText(extractInlineText(node)),
        href,
        kind: classifyHref(href),
        section,
        line: getPositionLine(node)
      } satisfies InlineLinkRecord
    ]
  })

  const hrefCounts = new Map<string, number>()
  for (const link of links) {
    hrefCounts.set(link.href, (hrefCounts.get(link.href) ?? 0) + 1)
  }

  return {
    text,
    section,
    line: getPositionLine(paragraphNode),
    links,
    rawUrls,
    repeatedHrefs: Array.from(hrefCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([href]) => href)
  }
}

function shouldFlagSparse(
  totalLinkCount: number,
  wordCount: number,
  sparseSections: string[]
): boolean {
  if (totalLinkCount === 0) {
    return sparseSections.length > 0 || wordCount >= 260
  }

  return totalLinkCount <= 1 && sparseSections.length > 1 && wordCount >= 600
}

function shouldFlagDense(
  totalLinkCount: number,
  warnings: InlineLinkWarning[],
  internalRuleLinkCount: number
): boolean {
  if (totalLinkCount > 5) {
    return true
  }

  if (internalRuleLinkCount > 2) {
    return true
  }

  return warnings.some(warning =>
    [
      'repeated-destinations-in-paragraph',
      'raw-urls-in-prose',
      'unsupported-external-link'
    ].includes(warning.code)
  )
}

function isApprovedExternalLink(
  href: string,
  options: InlineLinkAnalysisOptions,
  knownUrls: Set<string>
): boolean {
  if (!isExternalHref(href)) {
    return true
  }

  if (knownUrls.has(href)) {
    return true
  }

  const allowedPrimaryDomains = new Set(options.allowedPrimaryDomains ?? [])
  if (isAllowedPrimaryDomain(href, allowedPrimaryDomains)) {
    return true
  }

  return Boolean(options.policy && isTrustedSecondaryUrl(href, options.policy))
}

/**
 * Analyze inline-link density and heuristics for a rule body.
 *
 * @param body - MDX body content without frontmatter.
 * @param options - Known source/resource URLs and policy settings.
 * @returns Link counts, section summaries, and review warnings.
 */
export function analyzeRuleInlineLinks(
  body: string,
  options: InlineLinkAnalysisOptions = {}
): InlineLinkAnalysis {
  const tree = parser.parse(body)
  const paragraphs: InlineLinkParagraph[] = []
  const sectionMap = new Map<
    string,
    {
      title: string
      paragraphCount: number
      wordCount: number
      linkCount: number
      externalLinkCount: number
      internalRuleLinkCount: number
      claimSignalCount: number
    }
  >()
  const knownUrls = new Set([
    ...(options.knownSourceUrls ?? []),
    ...(options.knownResourceUrls ?? [])
  ])

  let currentSection = INTRO_SECTION_TITLE

  for (const child of getChildren(tree)) {
    if (getType(child) === 'heading') {
      const depth = Reflect.get(child, 'depth')
      if (depth === 2) {
        currentSection = normalizeText(extractInlineText(child)) || INTRO_SECTION_TITLE
        continue
      }
    }

    for (const paragraphNode of collectNodesByType(child, 'paragraph')) {
      const paragraph = buildParagraph(currentSection, paragraphNode)
      if (!paragraph.text && paragraph.links.length === 0 && paragraph.rawUrls.length === 0) {
        continue
      }

      paragraphs.push(paragraph)

      const section = sectionMap.get(currentSection) ?? {
        title: currentSection,
        paragraphCount: 0,
        wordCount: 0,
        linkCount: 0,
        externalLinkCount: 0,
        internalRuleLinkCount: 0,
        claimSignalCount: 0
      }

      section.paragraphCount += 1
      section.wordCount += countWords(paragraph.text)
      section.linkCount += paragraph.links.length
      section.externalLinkCount += paragraph.links.filter(link => link.kind === 'external').length
      section.internalRuleLinkCount += paragraph.links.filter(
        link => link.kind === 'internalRule'
      ).length
      section.claimSignalCount += countClaimSignals(paragraph.text)

      sectionMap.set(currentSection, section)
    }
  }

  const sections = Array.from(sectionMap.values())
  const warnings: InlineLinkWarning[] = []

  for (const paragraph of paragraphs) {
    if (detectFormulaicMetadataParagraph(paragraph.text)) {
      warnings.push({
        code: 'formulaic-metadata-prose',
        message:
          'formulaic metadata prose detected; keep inline links in natural sentences instead of `See also` or `Reference:` lines',
        section: paragraph.section,
        line: paragraph.line
      })
    }

    if (paragraph.repeatedHrefs.length > 0) {
      warnings.push({
        code: 'repeated-destinations-in-paragraph',
        message: `repeated destinations in one paragraph: ${paragraph.repeatedHrefs.join(', ')}`,
        section: paragraph.section,
        line: paragraph.line
      })
    }

    if (paragraph.rawUrls.length > 0) {
      warnings.push({
        code: 'raw-urls-in-prose',
        message: `raw URLs in prose: ${paragraph.rawUrls.join(', ')}`,
        section: paragraph.section,
        line: paragraph.line
      })
    }

    const internalRuleLinks = paragraph.links.filter(link => link.kind === 'internalRule')
    if (internalRuleLinks.length > 1) {
      warnings.push({
        code: 'internal-link-overuse',
        message: 'more than one internal rule link appears in the same paragraph',
        section: paragraph.section,
        line: paragraph.line
      })
    }

    for (const link of paragraph.links) {
      if (link.kind !== 'external') {
        continue
      }

      if (!isApprovedExternalLink(link.href, options, knownUrls)) {
        warnings.push({
          code: 'unsupported-external-link',
          message:
            'external inline link is outside the approved source tiers; add it to sources, use a trusted secondary domain, or move it to resources',
          section: paragraph.section,
          line: link.line
        })
      }
    }
  }

  const citationHeavySectionsWithoutLinks = sections
    .filter(
      section => section.linkCount === 0 && section.claimSignalCount >= 2 && section.wordCount >= 80
    )
    .map(section => section.title)

  for (const section of citationHeavySectionsWithoutLinks) {
    warnings.push({
      code: 'claim-heavy-section-without-links',
      message: 'claim-heavy section has no inline links',
      section
    })
  }

  const totalLinkCount = paragraphs.reduce((sum, paragraph) => sum + paragraph.links.length, 0)
  const externalLinkCount = paragraphs.reduce(
    (sum, paragraph) => sum + paragraph.links.filter(link => link.kind === 'external').length,
    0
  )
  const internalRuleLinkCount = paragraphs.reduce(
    (sum, paragraph) => sum + paragraph.links.filter(link => link.kind === 'internalRule').length,
    0
  )
  const otherLinkCount = totalLinkCount - externalLinkCount - internalRuleLinkCount
  const wordCount = sections.reduce((sum, section) => sum + section.wordCount, 0)

  const classification = shouldFlagDense(totalLinkCount, warnings, internalRuleLinkCount)
    ? 'too_dense'
    : shouldFlagSparse(totalLinkCount, wordCount, citationHeavySectionsWithoutLinks)
      ? 'too_sparse'
      : 'balanced'

  return {
    classification,
    totalLinkCount,
    externalLinkCount,
    internalRuleLinkCount,
    otherLinkCount,
    wordCount,
    paragraphs,
    sections,
    citationHeavySectionsWithoutLinks,
    warnings
  }
}

/**
 * Build candidate external inline links from authoritative sources and trusted secondary resources.
 *
 * @param input - Current analysis plus available sources and resources.
 * @returns Deduplicated review suggestions ordered by authority.
 */
export function buildExternalLinkCandidates(input: ExternalLinkCandidateInput): CandidateLink[] {
  const usedHrefs = new Set(
    input.analysis.paragraphs.flatMap(paragraph =>
      paragraph.links.filter(link => link.kind === 'external').map(link => link.href)
    )
  )
  const candidates = new Map<string, CandidateLink>()
  const allowedPrimaryDomains = new Set(input.allowedPrimaryDomains ?? [])

  for (const resource of input.resources ?? []) {
    const label = resource.name ?? resource.title
    if (!resource.url || !label || usedHrefs.has(resource.url)) {
      continue
    }

    if (!hasUnlinkedNamedMention(input.analysis, label, resource.url)) {
      continue
    }

    candidates.set(resource.url, {
      label,
      href: resource.url,
      reason: 'named tool or resource is mentioned in prose without a link',
      kind: 'secondary'
    })
  }

  for (const tool of input.tools ?? []) {
    const label = typeof tool === 'string' ? tool : tool.name
    const href = typeof tool === 'string' ? null : tool.url
    if (!label || !href || usedHrefs.has(href)) {
      continue
    }

    if (!hasUnlinkedNamedMention(input.analysis, label, href)) {
      continue
    }

    candidates.set(href, {
      label,
      href,
      reason: 'named tool is mentioned in prose without a link',
      kind: 'secondary'
    })
  }

  for (const source of input.sources ?? []) {
    if (!source.url || !source.title || usedHrefs.has(source.url)) {
      continue
    }

    candidates.set(source.url, {
      label: source.title,
      href: source.url,
      reason:
        source.authority === 'primary'
          ? 'authoritative frontmatter source'
          : 'frontmatter source already attached to the rule',
      kind: 'source'
    })
  }

  for (const resource of input.resources ?? []) {
    const label = resource.name ?? resource.title
    if (!resource.url || !label || usedHrefs.has(resource.url)) {
      continue
    }

    const resourceType = resource.type?.toLowerCase()
    if (resourceType === 'tool') {
      continue
    }

    if (
      !isAllowedPrimaryDomain(resource.url, allowedPrimaryDomains) &&
      !(input.policy && isTrustedSecondaryUrl(resource.url, input.policy))
    ) {
      continue
    }

    candidates.set(resource.url, {
      label,
      href: resource.url,
      reason: 'trusted secondary or official supplementary reference',
      kind: 'secondary'
    })
  }

  return Array.from(candidates.values()).slice(0, 4)
}

/**
 * Build candidate internal inline links from related-rule metadata.
 *
 * @param input - Current analysis plus resolved related-rule targets.
 * @returns Related-rule suggestions not already linked in the body.
 */
export function buildInternalLinkCandidates(input: InternalLinkCandidateInput): CandidateLink[] {
  const usedHrefs = new Set(
    input.analysis.paragraphs.flatMap(paragraph =>
      paragraph.links.filter(link => link.kind === 'internalRule').map(link => link.href)
    )
  )

  return (input.relatedRules ?? [])
    .filter(rule => rule.title && rule.href && !usedHrefs.has(rule.href))
    .slice(0, 3)
    .map(rule => ({
      label: rule.title ?? 'Related rule',
      href: rule.href ?? '',
      reason: 'relatedRules frontmatter already connects these topics',
      kind: 'internal'
    }))
}
