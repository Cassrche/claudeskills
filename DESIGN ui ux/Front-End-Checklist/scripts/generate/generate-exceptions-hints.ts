import { readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { analyzeRuleContract, collectRuleFiles, readRuleFile } from '../lib/rule-structure'

const CATEGORY_HINTS: Record<string, string[]> = {
  accessibility: [
    'Call out valid decorative, inert, or assistive-technology-safe exceptions explicitly.',
    'Document the stronger finding that should win when multiple accessibility issues overlap.',
    'Name the common false positives reviewers should ignore.'
  ],
  security: [
    'Document when a third-party integration or legacy browser requirement justifies a narrower exception.',
    'Explain which mitigations are mandatory before any exception is accepted.',
    'Name the configuration patterns that look unsafe but are acceptable in controlled environments.'
  ],
  seo: [
    'Document intentional duplicates, syndication cases, or noindex scenarios that should not be flagged.',
    'Explain which stronger crawl/indexing signal takes priority when rules appear to conflict.',
    'Name the common audit false positives for staging, faceted, or utility pages.'
  ],
  javascript: [
    'Document when framework/runtime behavior makes the raw pattern acceptable.',
    'Call out the common lint-like false positives and the preferred stronger finding.'
  ]
}

const files = collectRuleFiles(process.argv.slice(2).filter(arg => arg.endsWith('.mdx')))

for (const filePath of files) {
  const raw = readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  const { body } = readRuleFile(filePath)
  const category =
    path
      .relative(path.join(process.cwd(), 'packages/content/rules/en'), filePath)
      .split(path.sep)[0] ?? 'unknown'
  const slug = (parsed.data as { slug?: string }).slug ?? path.basename(filePath, '.mdx')
  const contract = analyzeRuleContract({ category, slug, body })
  if (!contract.missingRecommendations.includes('exceptions')) continue

  console.log(`\n${path.relative(process.cwd(), filePath)}`)
  console.log('## Exceptions')
  console.log('')
  for (const hint of CATEGORY_HINTS[category] ?? CATEGORY_HINTS.javascript) {
    console.log(`- ${hint}`)
  }
}
