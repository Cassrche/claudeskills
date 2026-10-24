import { readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { analyzeRuleContract, collectRuleFiles, readRuleFile } from '../lib/rule-structure'

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
  if (!contract.missingRecommendations.includes('verificationSplit')) continue

  console.log(`\n${path.relative(process.cwd(), filePath)}`)
  console.log('## Verification')
  console.log('')
  console.log('### Automated Checks')
  console.log('')
  console.log(
    '- Add CI, lint, crawler, Lighthouse, axe, curl, or script-based validation steps here.'
  )
  console.log('')
  console.log('### Manual Checks')
  console.log('')
  console.log('- Add browser, assistive-tech, rendering, or judgment-based checks here.')
}
