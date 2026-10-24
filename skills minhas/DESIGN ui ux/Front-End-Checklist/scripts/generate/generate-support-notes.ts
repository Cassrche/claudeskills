import { readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { analyzeRuleContract, collectRuleFiles, readRuleFile } from '../lib/rule-structure'
import { getRuleSupportData } from '../lib/rule-support-data'

type Frontmatter = {
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

const files = collectRuleFiles(process.argv.slice(2).filter(arg => arg.endsWith('.mdx')))

for (const filePath of files) {
  const raw = readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  const { body } = readRuleFile(filePath)
  const fm = parsed.data as Frontmatter
  const category =
    path
      .relative(path.join(process.cwd(), 'packages/content/rules/en'), filePath)
      .split(path.sep)[0] ?? 'unknown'
  const slug = fm.slug ?? path.basename(filePath, '.mdx')
  const contract = analyzeRuleContract({
    category,
    slug,
    title: fm.title,
    subcategory: fm.subcategory,
    body,
    sources: fm.sources,
    resources: fm.resources,
    tools: fm.tools,
    prompts: fm.prompts
  })

  if (!contract.missingRecommendations.includes('supportNotes')) continue

  const support = getRuleSupportData(slug)
  if (!support) continue

  const unsupported =
    support.unsupportedTargets.length > 0
      ? `Unsupported targets in the current project matrix: ${support.unsupportedTargets.join(', ')}.`
      : 'Supported across the current project browser matrix.'
  const baseline = support.baselineMinimums
    .filter(entry => ['chrome', 'edge', 'firefox', 'safari', 'safari_ios'].includes(entry.browser))
    .slice(0, 5)
    .map(entry => `${entry.browser} ${entry.version}`)
    .join(', ')

  console.log(`\n${path.relative(process.cwd(), filePath)}`)
  console.log('## Support Notes')
  console.log('')
  console.log(`- ${unsupported}`)
  console.log(`- Baseline-compatible minimums: ${baseline}.`)
  console.log('- Add a fallback note only when a required target is outside that support range.')
}
