import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Category, Rule } from '@repo/types'

type RulePriority = Rule['priority']

export const ACCESSIBILITY: Category[] = ['accessibility']
export const IMAGES: Category[] = ['images']
export const JAVASCRIPT: Category[] = ['javascript']
export const SECURITY: Category[] = ['security']
export const HTML: Category[] = ['html']

const CATEGORY_VALUES = [
  'html',
  'css',
  'javascript',
  'performance',
  'accessibility',
  'seo',
  'security',
  'images',
  'testing',
  'privacy',
  'pwa',
  'i18n'
]

const PRIORITY_VALUES = ['critical', 'high', 'medium', 'low']

/**
 * Check whether a frontmatter category string is part of the project taxonomy.
 *
 * @param value - Raw category value from MDX frontmatter.
 * @returns Whether the value is a valid rule category.
 */
function isCategory(value: string): value is Category {
  return CATEGORY_VALUES.includes(value)
}

/**
 * Check whether a frontmatter priority string is valid for a rule.
 *
 * @param value - Raw priority value from MDX frontmatter.
 * @returns Whether the value is a valid rule priority.
 */
function isPriority(value: string): value is RulePriority {
  return PRIORITY_VALUES.includes(value)
}

/**
 * Read a single-line scalar value from the MDX frontmatter block.
 *
 * @param frontmatter - Raw frontmatter text.
 * @param key - Frontmatter key to read.
 * @returns Trimmed string value, if present.
 */
function readFrontmatterValue(frontmatter: string, key: string): string | undefined {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '')
}

/**
 * Parse inline YAML array categories from frontmatter.
 *
 * @param rawValue - Raw inline array value.
 * @returns Valid project categories from the value.
 */
function parseCategoryList(rawValue: string): Category[] {
  return rawValue
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map(value => value.trim().replace(/^['"]|['"]$/g, ''))
    .filter(isCategory)
}

/**
 * Read categories from inline or block-style YAML, falling back to the folder category.
 *
 * @param frontmatter - Raw frontmatter text.
 * @param fallbackCategory - Rule folder category.
 * @returns Valid categories for the rule.
 */
function readFrontmatterCategories(frontmatter: string, fallbackCategory: string): Category[] {
  const rawValue = readFrontmatterValue(frontmatter, 'categories') ?? ''
  const inlineValues = parseCategoryList(rawValue)

  if (inlineValues.length > 0) {
    return inlineValues
  }

  const blockMatch = frontmatter.match(/^categories:\s*\n((?:\s+- .+\n?)+)/m)
  const blockValues =
    blockMatch?.[1]
      ?.split('\n')
      .map(line => line.replace(/^\s+-\s*/, '').trim())
      .filter(Boolean)
      .filter(isCategory) ?? []

  if (blockValues.length > 0) {
    return blockValues
  }

  return isCategory(fallbackCategory) ? [fallbackCategory] : ['general']
}

/**
 * Load real MDX rules for quality tests without relying on generated artifacts.
 *
 * @returns Rule records with the fields needed by MCP tool executors.
 */
export function loadRulesFromMdx(): Rule[] {
  const rulesDir = path.resolve(__dirname, '..', '..', '..', 'content', 'rules', 'en')
  const rules: Rule[] = []

  for (const category of fs.readdirSync(rulesDir).sort()) {
    const categoryDir = path.join(rulesDir, category)
    if (!fs.statSync(categoryDir).isDirectory()) {
      continue
    }

    for (const filename of fs.readdirSync(categoryDir).sort()) {
      if (!filename.endsWith('.mdx')) {
        continue
      }

      const slug = filename.replace(/\.mdx$/, '')
      const filePath = path.join(categoryDir, filename)
      const source = fs.readFileSync(filePath, 'utf8')
      const frontmatterMatch = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
      const frontmatter = frontmatterMatch?.[1] ?? ''
      const content = frontmatterMatch?.[2] ?? source
      const categories = readFrontmatterCategories(frontmatter, category)
      const primaryCategory = categories[0]
      const rawPriority = readFrontmatterValue(frontmatter, 'priority') ?? 'medium'
      const priority = isPriority(rawPriority) ? rawPriority : 'medium'

      rules.push({
        title: readFrontmatterValue(frontmatter, 'title') ?? slug,
        slug,
        categories,
        priority,
        primaryCategory,
        content,
        url: `/rules/${primaryCategory}/${slug}`,
        prompts: {
          check: readFrontmatterValue(frontmatter, 'check') ?? `Check ${slug}.`,
          fix: readFrontmatterValue(frontmatter, 'fix') ?? `Fix ${slug}.`,
          explain: readFrontmatterValue(frontmatter, 'explain') ?? `Explain ${slug}.`
        }
      })
    }
  }

  return rules
}
