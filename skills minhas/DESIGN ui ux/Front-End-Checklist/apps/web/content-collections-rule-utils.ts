import { CATEGORIES } from '@repo/config'
import type { RuleSourceSummary } from '@repo/types'
import { SUBCATEGORIES, type Subcategory } from '@repo/types'
import type rehypePrettyCode from 'rehype-pretty-code'

export const subcategoryValues = SUBCATEGORIES as [Subcategory, ...Subcategory[]]
export const categoryValues = CATEGORIES as [string, ...string[]]
export const RULE_SOURCE_ROLES = [
  'standard',
  'reference',
  'implementation',
  'compatibility',
  'regulation',
  'search',
  'research'
] as const
export const RULE_SOURCE_AUTHORITIES = ['primary', 'secondary'] as const

export type RuleSourceRole = (typeof RULE_SOURCE_ROLES)[number]
export type RuleSourceAuthority = (typeof RULE_SOURCE_AUTHORITIES)[number]

/**
 * Build a stable metadata slug from a title-like source label.
 *
 * @param value - Source label or title.
 * @param fallback - Fallback identifier when normalization empties the value.
 * @returns Stable ID suitable for frontmatter normalization.
 */
export function slugifyMetadataId(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || fallback
}

/**
 * Infer the most appropriate source role from type and domain hints.
 *
 * @param source - Raw source metadata.
 * @param index - Position within the source array.
 * @returns Normalized rule-source role.
 */
export function inferSourceRole(
  source: { type?: string; url?: string },
  index: number
): RuleSourceRole {
  const type = source.type?.toLowerCase()
  const hostname = source.url ? new URL(source.url).hostname.toLowerCase() : ''

  if (type === 'wcag' || type === 'spec') return 'standard'
  if (type === 'google' || hostname.includes('developers.google.com')) return 'search'
  if (type === 'owasp') return 'regulation'
  if (hostname.includes('caniuse') || hostname.includes('web-platform-dx')) return 'compatibility'
  if (type === 'mdn' || type === 'documentation') return 'reference'
  if (type === 'guide' || type === 'web.dev') return index === 0 ? 'reference' : 'implementation'

  return index === 0 ? 'reference' : 'implementation'
}

/**
 * Infer whether a source should be treated as primary or secondary authority.
 *
 * @param source - Raw source metadata.
 * @returns Authority classification for the source.
 */
export function inferSourceAuthority(source: { type?: string; url?: string }): RuleSourceAuthority {
  const type = source.type?.toLowerCase()
  const hostname = source.url ? new URL(source.url).hostname.toLowerCase() : ''

  if (
    type === 'wcag' ||
    type === 'spec' ||
    type === 'owasp' ||
    type === 'google' ||
    hostname.endsWith('w3.org') ||
    hostname.endsWith('mozilla.org') ||
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

/**
 * Build the compact source summary used in API and UI responses.
 *
 * @param input - Normalized source records.
 * @returns Aggregate source counts for the rule.
 */
export function buildSourceSummary({
  sources
}: {
  sources: Array<{ authority: RuleSourceAuthority; role: RuleSourceRole }>
}): RuleSourceSummary {
  const primarySourceCount = sources.filter(source => source.authority === 'primary').length
  const sourceRoleCount = new Set(sources.map(source => source.role)).size

  return {
    sourceCount: sources.length,
    primarySourceCount,
    sourceRoleCount
  }
}

export const rehypePrettyCodeOptions = {
  theme: {
    dark: 'github-dark',
    light: 'github-light'
  },
  keepBackground: false,
  defaultLang: {
    block: 'plaintext',
    inline: 'plaintext'
  },
  onVisitLine(node: any) {
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }]
    }
  },
  onVisitHighlightedLine(node: any) {
    node.properties.className = ['line--highlighted']
  },
  onVisitHighlightedChars(node: any) {
    node.properties.className = ['word--highlighted']
  }
} satisfies Parameters<typeof rehypePrettyCode>[0]
