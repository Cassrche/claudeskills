/**
 * Expand curated relatedRules frontmatter for stronger internal linking.
 *
 * Usage:
 *   pnpm expand:related-rules
 *   pnpm expand:related-rules --write
 */

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const RULES_DIR = path.join(process.cwd(), 'packages/content/rules/en')
const TARGET_RELATED_RULES = 4

type RuleFrontmatter = {
  title?: string
  description?: string
  categories?: string[]
  subcategory?: string
  slug?: string
  tldr?: string[]
  relatedRules?: Array<{ slug: string; reason?: string }>
}

type RuleDoc = {
  filePath: string
  category: string
  slug: string
  subcategory?: string
  data: RuleFrontmatter
  content: string
  tokens: Set<string>
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'your',
  'when',
  'only',
  'each',
  'them',
  'they',
  'their',
  'html',
  'css',
  'javascript',
  'page',
  'pages',
  'rule',
  'rules',
  'use',
  'using',
  'ensure',
  'avoid',
  'valid',
  'improve',
  'checks',
  'check',
  'make',
  'keep'
])

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(token => token.length > 2 && !STOP_WORDS.has(token))
  )
}

function loadRules(): RuleDoc[] {
  const docs: RuleDoc[] = []

  for (const category of fs.readdirSync(RULES_DIR)) {
    const categoryDir = path.join(RULES_DIR, category)
    if (!fs.statSync(categoryDir).isDirectory()) continue

    for (const file of fs.readdirSync(categoryDir)) {
      if (!file.endsWith('.mdx')) continue

      const filePath = path.join(categoryDir, file)
      const raw = fs.readFileSync(filePath, 'utf8')
      const parsed = matter(raw)
      const data = parsed.data as RuleFrontmatter
      const slug = data.slug ?? path.basename(file, '.mdx')
      const title = data.title ?? slug
      const description = data.description ?? ''
      const tldr = Array.isArray(data.tldr) ? data.tldr.join(' ') : ''

      docs.push({
        filePath,
        category,
        slug,
        subcategory: data.subcategory,
        data,
        content: parsed.content,
        tokens: tokenize(`${title} ${description} ${tldr}`)
      })
    }
  }

  return docs
}

function pickRelatedRules(rule: RuleDoc, docs: RuleDoc[]): Array<{ slug: string; reason: string }> {
  const existing = new Set((rule.data.relatedRules ?? []).map(item => item.slug))
  const current = [...(rule.data.relatedRules ?? [])]

  const scored = docs
    .filter(candidate => candidate.slug !== rule.slug)
    .map(candidate => {
      let score = 0

      if (candidate.category === rule.category) score += 4
      if (candidate.subcategory && rule.subcategory && candidate.subcategory === rule.subcategory) {
        score += 6
      }
      for (const token of rule.tokens) {
        if (candidate.tokens.has(token)) score += 1
      }

      return { candidate, score }
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.slug.localeCompare(b.candidate.slug))

  const additions: Array<{ slug: string; reason: string }> = []

  for (const { candidate } of scored) {
    if (existing.has(candidate.slug)) continue
    if (current.length + additions.length >= TARGET_RELATED_RULES) break

    const reason =
      rule.subcategory && candidate.subcategory === rule.subcategory
        ? `Both rules sit in the \`${rule.category}/${rule.subcategory}\` area and are commonly reviewed together.`
        : candidate.category === rule.category
          ? `Both rules affect ${rule.category} quality and are commonly reviewed together.`
          : `Both rules intersect in real audits and often influence the same implementation decisions.`

    existing.add(candidate.slug)
    additions.push({ slug: candidate.slug, reason })
  }

  return [...current, ...additions]
}

async function main() {
  const write = process.argv.includes('--write')
  const docs = loadRules()
  let changed = 0

  for (const doc of docs) {
    const nextRelatedRules = pickRelatedRules(doc, docs)
    const currentLength = (doc.data.relatedRules ?? []).length
    if (nextRelatedRules.length === currentLength) continue

    const nextFrontmatter = {
      ...doc.data,
      relatedRules: nextRelatedRules
    }

    changed += 1
    console.log(
      `${path.relative(process.cwd(), doc.filePath)}: ${currentLength} -> ${nextRelatedRules.length}`
    )

    if (write) {
      fs.writeFileSync(doc.filePath, matter.stringify(doc.content, nextFrontmatter))
    }
  }

  console.log(`\n${write ? 'Updated' : 'Would update'} ${changed} rule files.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
