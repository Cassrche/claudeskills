/**
 * Regenerates the rules catalog block in the root README.
 *
 * Usage:
 *   pnpm generate:readme
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { absoluteRuleUrl, absoluteUrl, routeRulesCategory } from '../../packages/config/src/routes'
import {
  type FrontendChecklistCategory,
  type FrontendChecklistPriority,
  RULE_CATEGORIES
} from '../../packages/rules/src/types'

const README_PATH = path.join(process.cwd(), 'README.md')
const RULES_DIR = path.join(process.cwd(), 'packages/content/rules/en')
const FULL_CATALOG_PATH = path.join(process.cwd(), 'docs/generated/rules-catalog.md')
const START_MARKER = '<!-- rules-catalog:start -->'
const END_MARKER = '<!-- rules-catalog:end -->'

const CATEGORY_DISPLAY: Record<FrontendChecklistCategory, { title: string; description: string }> =
  {
    html: {
      title: 'HTML',
      description: 'Semantic markup, metadata, forms, and document structure rules.'
    },
    css: {
      title: 'CSS',
      description: 'Layout, typography, responsive design, and styling rules.'
    },
    javascript: {
      title: 'JavaScript',
      description: 'Client-side behavior, async patterns, and runtime quality rules.'
    },
    performance: {
      title: 'Performance',
      description: 'Loading speed, rendering, optimization, and Core Web Vitals rules.'
    },
    accessibility: {
      title: 'Accessibility',
      description: 'Keyboard, screen reader, ARIA, and inclusive UX rules.'
    },
    seo: {
      title: 'SEO',
      description: 'Crawlability, metadata, structured data, and search visibility rules.'
    },
    security: {
      title: 'Security',
      description: 'Headers, transport, safe linking, and frontend security rules.'
    },
    images: {
      title: 'Images',
      description: 'Formats, responsive delivery, optimization, and media quality rules.'
    },
    testing: {
      title: 'Testing',
      description: 'Unit, integration, E2E, monitoring, and quality assurance rules.'
    },
    privacy: {
      title: 'Privacy',
      description: 'Consent, tracking, retention, and user data rights rules.'
    },
    pwa: {
      title: 'PWA',
      description: 'Installability, manifest, offline, and app-like experience rules.'
    },
    i18n: {
      title: 'Internationalization',
      description: 'Localization, RTL, language handling, and translation workflow rules.'
    }
  }

interface RuleFrontmatter {
  title?: string
  description?: string
  categories?: string[]
  priority?: FrontendChecklistPriority
}

interface RuleEntry {
  category: FrontendChecklistCategory
  title: string
  description: string
  priority: FrontendChecklistPriority
  slug: string
}

interface ReadmeStats {
  ruleCount: number
  categoryCount: number
}

const README_PRIORITY_IMAGE_PATHS: Record<FrontendChecklistPriority, string> = {
  critical: './apps/web/public/priority/critical.svg',
  high: './apps/web/public/priority/high.svg',
  medium: './apps/web/public/priority/medium.svg',
  low: './apps/web/public/priority/low.svg'
}

const FULL_CATALOG_PRIORITY_IMAGE_PATHS: Record<FrontendChecklistPriority, string> = {
  critical: '../../apps/web/public/priority/critical.svg',
  high: '../../apps/web/public/priority/high.svg',
  medium: '../../apps/web/public/priority/medium.svg',
  low: '../../apps/web/public/priority/low.svg'
}

/**
 * Normalize markdown text into a single compact line for list rendering.
 *
 * @param value - Raw frontmatter string.
 * @returns Cleaned, single-line text.
 */
function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Check whether a string is a supported rule priority.
 *
 * @param value - Priority candidate.
 * @returns True when the priority is supported.
 */
function isRulePriority(value: string): value is FrontendChecklistPriority {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low'
}

/**
 * Resolve a valid priority from frontmatter with a safe default.
 *
 * @param priority - Frontmatter priority candidate.
 * @returns Canonical priority.
 */
function resolveRulePriority(priority?: string): FrontendChecklistPriority {
  if (priority && isRulePriority(priority)) {
    return priority
  }

  return 'medium'
}

/**
 * Format a priority label for generated markdown.
 *
 * @param priority - Canonical rule priority.
 * @returns Human-readable priority label.
 */
function formatPriorityLabel(priority: FrontendChecklistPriority): string {
  if (priority === 'critical') return 'Critical'
  if (priority === 'high') return 'High'
  if (priority === 'medium') return 'Medium'
  return 'Low'
}

/**
 * Format a priority badge using markdown image references.
 *
 * @param priority - Canonical rule priority.
 * @returns Markdown badge.
 */
function formatPriorityBadge(priority: FrontendChecklistPriority): string {
  return `![${formatPriorityLabel(priority)}][${priority}_img]`
}

/**
 * Build markdown image reference lines for priority badges.
 *
 * @param imagePaths - Badge image paths keyed by priority.
 * @returns Reference definitions.
 */
function buildPriorityImageReferences(
  imagePaths: Record<FrontendChecklistPriority, string>
): string[] {
  return [
    `[critical_img]: ${imagePaths.critical}`,
    `[high_img]: ${imagePaths.high}`,
    `[medium_img]: ${imagePaths.medium}`,
    `[low_img]: ${imagePaths.low}`
  ]
}

/**
 * Check whether a string is a supported rule category.
 *
 * @param value - Category candidate.
 * @returns True when the category is supported.
 */
function isRuleCategory(value: string): value is FrontendChecklistCategory {
  return RULE_CATEGORIES.some(category => category === value)
}

/**
 * Resolve a rule category from frontmatter or filesystem location.
 *
 * @param fileCategory - Category inferred from the rule directory.
 * @param frontmatterCategories - Optional categories array from frontmatter.
 * @returns Canonical rule category.
 */
function resolveRuleCategory(
  fileCategory: string,
  frontmatterCategories?: string[]
): FrontendChecklistCategory {
  const frontmatterPrimary = frontmatterCategories?.[0]?.toLowerCase()
  if (frontmatterPrimary && isRuleCategory(frontmatterPrimary)) {
    return frontmatterPrimary
  }

  if (isRuleCategory(fileCategory)) {
    return fileCategory
  }

  throw new Error(`Unsupported rule category: ${fileCategory}`)
}

/**
 * Load normalized rule entries from the English rules directory.
 *
 * @returns Sorted rule entries for README generation.
 */
export function loadRuleEntries(): RuleEntry[] {
  const entries: RuleEntry[] = []

  for (const fileCategory of readdirSync(RULES_DIR)) {
    const categoryDir = path.join(RULES_DIR, fileCategory)
    if (!statSync(categoryDir).isDirectory()) {
      continue
    }

    const files = readdirSync(categoryDir).filter(file => file.endsWith('.mdx'))

    for (const file of files) {
      const filePath = path.join(categoryDir, file)
      const raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
      const { data } = matter(raw)
      const frontmatter = data as RuleFrontmatter
      const slug = path.basename(file, '.mdx')
      const title = compactText(frontmatter.title || slug)
      const description = compactText(frontmatter.description || 'No description available.')
      const category = resolveRuleCategory(fileCategory, frontmatter.categories)
      const priority = resolveRulePriority(frontmatter.priority)

      entries.push({
        category,
        title,
        description,
        priority,
        slug
      })
    }
  }

  return entries.sort((a, b) => {
    const categoryDelta = RULE_CATEGORIES.indexOf(a.category) - RULE_CATEGORIES.indexOf(b.category)
    if (categoryDelta !== 0) {
      return categoryDelta
    }

    return a.title.localeCompare(b.title)
  })
}

/**
 * Build the generated README catalog markdown.
 *
 * @param rules - Normalized rule entries.
 * @returns Markdown content that belongs between the README markers.
 */
export function buildRulesCatalogMarkdown(rules: RuleEntry[]): string {
  const categoryBuckets = new Map<FrontendChecklistCategory, RuleEntry[]>()

  for (const rule of rules) {
    const bucket = categoryBuckets.get(rule.category)
    if (bucket) {
      bucket.push(rule)
    } else {
      categoryBuckets.set(rule.category, [rule])
    }
  }

  const lines = [
    '',
    `<!-- Generated from ${rules.length} English rules. This block is maintained by \`pnpm generate:readme\`. -->`,
    ''
  ]

  for (const category of RULE_CATEGORIES) {
    const categoryRules = categoryBuckets.get(category)
    if (!categoryRules || categoryRules.length === 0) {
      continue
    }

    const meta = CATEGORY_DISPLAY[category]
    lines.push(`### ${meta.title} (${categoryRules.length})`, '')
    lines.push(meta.description, '')

    for (const rule of categoryRules) {
      lines.push(
        `- [ ] [${rule.title}](${routeRule(rule.category, rule.slug)}): ${rule.description}`
      )
    }

    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

/**
 * Build the compact README summary block for category-level rule coverage.
 *
 * @param rules - Normalized rule entries.
 * @returns Markdown content that belongs between the README markers.
 */
export function buildReadmeCatalogMarkdown(rules: RuleEntry[]): string {
  const categoryBuckets = new Map<FrontendChecklistCategory, RuleEntry[]>()

  for (const rule of rules) {
    const bucket = categoryBuckets.get(rule.category)
    if (bucket) {
      bucket.push(rule)
    } else {
      categoryBuckets.set(rule.category, [rule])
    }
  }

  const lines = [
    '',
    `<!-- Generated from ${rules.length} English rules. This block is maintained by \`pnpm generate:readme\`. -->`,
    '',
    '### Jump to a category',
    ''
  ]

  for (const category of RULE_CATEGORIES) {
    const categoryRules = categoryBuckets.get(category)
    if (!categoryRules || categoryRules.length === 0) {
      continue
    }

    const meta = CATEGORY_DISPLAY[category]
    const anchor = meta.title.toLowerCase().replace(/\s+/g, '-')

    lines.push(
      `- [${meta.title}](#${anchor}) (${categoryRules.length}) · [Open on the site](${absoluteUrl(routeRulesCategory(category))})`
    )
  }

  lines.push('', '### Categories', '')

  for (const category of RULE_CATEGORIES) {
    const categoryRules = categoryBuckets.get(category)
    if (!categoryRules || categoryRules.length === 0) {
      continue
    }

    const meta = CATEGORY_DISPLAY[category]
    lines.push(`### ${meta.title}`, '')
    lines.push(`*${categoryRules.length} rules. ${meta.description}*`, '')
    lines.push(
      `[Browse ${meta.title} on frontendchecklist.io](${absoluteUrl(routeRulesCategory(category))})`,
      ''
    )

    for (const rule of categoryRules) {
      lines.push(
        `- [ ] [${rule.title}](${absoluteRuleUrl(rule.category, rule.slug)}) ${formatPriorityBadge(rule.priority)}: ${rule.description}`
      )
    }

    lines.push('', '**[Back to top](#front-end-checklist)**', '')
  }

  lines.push(...buildPriorityImageReferences(README_PRIORITY_IMAGE_PATHS), '')

  return lines.join('\n').trimEnd()
}

/**
 * Build the full generated rules catalog file.
 *
 * @param rules - Normalized rule entries.
 * @returns Full markdown document for the generated catalog.
 */
export function buildFullCatalogMarkdown(rules: RuleEntry[]): string {
  const categoryBuckets = new Map<FrontendChecklistCategory, RuleEntry[]>()

  for (const rule of rules) {
    const bucket = categoryBuckets.get(rule.category)
    if (bucket) {
      bucket.push(rule)
    } else {
      categoryBuckets.set(rule.category, [rule])
    }
  }

  const lines = [
    '# Front-End Checklist Rules Catalog',
    '',
    '<!-- Generated from rule frontmatter. Do not edit manually. Run `pnpm generate:readme`. -->',
    '',
    `Generated from ${rules.length} English rules across ${categoryBuckets.size} categories.`,
    '',
    '## Quick links',
    ''
  ]

  for (const category of RULE_CATEGORIES) {
    const categoryRules = categoryBuckets.get(category)
    if (!categoryRules || categoryRules.length === 0) {
      continue
    }

    const meta = CATEGORY_DISPLAY[category]
    lines.push(
      `- [${meta.title}](#${meta.title.toLowerCase().replace(/\s+/g, '-')}) (${categoryRules.length})`
    )
  }

  lines.push('', '## Categories', '')

  for (const category of RULE_CATEGORIES) {
    const categoryRules = categoryBuckets.get(category)
    if (!categoryRules || categoryRules.length === 0) {
      continue
    }

    const meta = CATEGORY_DISPLAY[category]
    lines.push(`### ${meta.title}`, '')
    lines.push(meta.description, '')
    lines.push(
      `[Browse ${meta.title} on frontendchecklist.io](${absoluteUrl(routeRulesCategory(category))})`,
      ''
    )

    for (const rule of categoryRules) {
      lines.push(
        `- [ ] [${rule.title}](${absoluteRuleUrl(rule.category, rule.slug)}) ${formatPriorityBadge(rule.priority)}: ${rule.description}`
      )
    }

    lines.push('', '**[Back to top](#front-end-checklist-rules-catalog)**', '')
  }

  lines.push(...buildPriorityImageReferences(FULL_CATALOG_PRIORITY_IMAGE_PATHS), '')

  return lines.join('\n').trimEnd()
}

/**
 * Replace the generated rules catalog block in the root README.
 *
 * @param readme - Existing README contents.
 * @param generatedBlock - Generated markdown to inject between the markers.
 * @returns Updated README contents.
 */
export function replaceRulesCatalog(readme: string, generatedBlock: string): string {
  const startMatches = readme.match(new RegExp(START_MARKER, 'g')) ?? []
  const endMatches = readme.match(new RegExp(END_MARKER, 'g')) ?? []

  if (startMatches.length !== 1 || endMatches.length !== 1) {
    throw new Error(
      'README must contain exactly one rules catalog start marker and one end marker.'
    )
  }

  const startIndex = readme.indexOf(START_MARKER)
  const endIndex = readme.indexOf(END_MARKER)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('README rules catalog markers are missing or out of order.')
  }

  const before = readme.slice(0, startIndex + START_MARKER.length)
  const after = readme.slice(endIndex)

  return `${before}\n${generatedBlock}\n${after}`
}

/**
 * Replace the README corpus stats in the "What you get" section.
 *
 * @param readme - Existing README contents.
 * @param stats - Current corpus totals.
 * @returns README contents with refreshed corpus stats.
 */
export function replaceReadmeStats(readme: string, stats: ReadmeStats): string {
  return readme.replace(
    /- `\d+` English rules across `\d+` active categories/,
    `- \`${stats.ruleCount}\` English rules across \`${stats.categoryCount}\` active categories`
  )
}

/**
 * Regenerate the root README rules catalog block.
 */
function main(): void {
  const readme = readFileSync(README_PATH, 'utf-8')
  const rules = loadRuleEntries()
  const generatedReadmeBlock = buildReadmeCatalogMarkdown(rules)
  const readmeWithCatalog = replaceRulesCatalog(readme, generatedReadmeBlock)
  const updatedReadme = replaceReadmeStats(readmeWithCatalog, {
    ruleCount: rules.length,
    categoryCount: new Set(rules.map(rule => rule.category)).size
  })
  const fullCatalog = buildFullCatalogMarkdown(rules)

  mkdirSync(path.dirname(FULL_CATALOG_PATH), { recursive: true })
  writeFileSync(README_PATH, updatedReadme)
  writeFileSync(FULL_CATALOG_PATH, `${fullCatalog}\n`)
  console.log(`Updated README summary and full catalog with ${rules.length} rules.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
