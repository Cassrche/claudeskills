/**
 * Canonicalize rule bodies to the core structure:
 * intro -> Code Example(s) -> Why It Matters -> optional sections -> Verification
 *
 * Usage:
 *   pnpm tsx scripts/rule-structure/fix-rule-structure.ts --report
 *   pnpm tsx scripts/rule-structure/fix-rule-structure.ts --write
 *   pnpm tsx scripts/rule-structure/fix-rule-structure.ts path/to/rule.mdx --write
 */

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import {
  collectRuleFiles,
  extractRuleSections,
  isCodeExampleHeading,
  isVerificationHeading,
  isWhyItMattersHeading,
  RULES_DIR
} from '../lib/rule-structure'

type RuleFrontmatter = {
  title?: string
  description?: string
  whyItMatters?: string
  categories?: string[]
}

interface FixResult {
  filePath: string
  relativePath: string
  changed: boolean
  createdWhySection: boolean
  createdCodeExampleSection: boolean
  createdVerificationSection: boolean
}

const FALLBACK_CODE_EXAMPLE_BY_CATEGORY: Record<string, string> = {
  accessibility: `## Code Example

\`\`\`md
Screen reader test checklist:
- Open the page in a screen reader such as NVDA, VoiceOver, or JAWS
- Navigate the primary flow using headings, landmarks, and form controls
- Confirm names, roles, states, and announcements are understandable
\`\`\`
`,
  testing: `## Code Example

\`\`\`bash
# Replace with a real project command for this rule
pnpm test
\`\`\`
`,
  default: `## Code Example

\`\`\`html
<!-- Replace this placeholder with a concrete passing and failing example -->
\`\`\`
`
}

function getFlag(args: string[], flag: string): boolean {
  return args.includes(flag)
}

function chooseCodeHeading(sectionRaw: string): string {
  const count = (sectionRaw.match(/```/g) ?? []).length / 2
  return count > 1 ? 'Code Examples' : 'Code Example'
}

function renameH2(sectionRaw: string, heading: string): string {
  return sectionRaw.replace(/^##\s+.*$/m, `## ${heading}`)
}

function verificationSectionFor(category: string): string {
  switch (category) {
    case 'accessibility':
      return `## Verification

1. Test the affected UI with keyboard-only navigation and confirm the rule holds in the rendered experience.
2. Inspect the browser accessibility tree or accessibility pane for the relevant element, role, or accessible name.
3. Run an automated accessibility checker such as axe or Lighthouse where applicable.
4. Re-test one representative user flow with a screen reader if this rule affects a key interaction.
`
    case 'performance':
      return `## Verification

1. Measure the affected page or flow in Lighthouse, PageSpeed Insights, or DevTools and confirm the targeted metric improves.
2. Verify the change on a throttled mobile profile, not just local desktop.
3. Inspect the network waterfall or performance timeline to confirm the intended resource or execution change actually took effect.
4. If this rule maps to a budget or Web Vital, confirm the page now stays within that threshold.
`
    case 'security':
      return `## Verification

1. Inspect the final HTTP response or browser behavior to confirm the control is actually enforced.
2. Test the affected flow in a production-like environment, not just local development.
3. Verify third-party integrations or embeds still work after the restriction is applied.
4. Document any intentional exceptions explicitly.
`
    case 'seo':
      return `## Verification

1. Inspect rendered HTML and HTTP headers to confirm the expected metadata or crawlability signal is present.
2. Test the affected URL with Google Search Console or equivalent tooling where relevant.
3. Confirm the change does not create conflicting canonical-url, robots, or structured-data signals.
4. Re-crawl a representative page set after deployment.
`
    default:
      return `## Verification

1. Confirm the rule in the final rendered output or runtime behavior.
2. Test one primary path and one edge case affected by the change.
3. Use browser or CI tooling where applicable to verify the fix.
4. Re-check shared abstractions so the fix is applied consistently.
`
  }
}

function buildWhySection(frontmatter: RuleFrontmatter): string {
  const body =
    frontmatter.whyItMatters?.trim() ||
    frontmatter.description?.trim() ||
    'Explain the user impact of this rule and how it reduces risk, regressions, or poor UX.'
  return `## Why It Matters

${body}
`
}

function buildFallbackCodeSection(category: string): string {
  return FALLBACK_CODE_EXAMPLE_BY_CATEGORY[category] ?? FALLBACK_CODE_EXAMPLE_BY_CATEGORY.default
}

function fixRule(filePath: string, write: boolean): FixResult {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\0/g, '')
  const parsed = matter(raw)
  const data = parsed.data as RuleFrontmatter
  const category = path.relative(RULES_DIR, filePath).split(path.sep)[0] ?? 'default'
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
  const sectionsState = extractRuleSections(parsed.content)
  const sections = [...sectionsState.sections]

  const existingVerificationIndex = sections.findLastIndex(section =>
    isVerificationHeading(section.heading.text)
  )

  let verificationSection =
    existingVerificationIndex !== -1
      ? renameH2(sections[existingVerificationIndex].raw, 'Verification')
      : verificationSectionFor(category)

  let createdVerificationSection = existingVerificationIndex === -1

  const nonVerificationSections = sections.filter((_, index) => index !== existingVerificationIndex)

  const existingCodeIndex = nonVerificationSections.findIndex(section =>
    isCodeExampleHeading(section.heading.text)
  )

  let codeSectionRaw = ''
  let createdCodeExampleSection = false
  const consumedIndexes = new Set<number>()

  if (existingCodeIndex !== -1) {
    codeSectionRaw = renameH2(
      nonVerificationSections[existingCodeIndex].raw,
      chooseCodeHeading(nonVerificationSections[existingCodeIndex].raw)
    )
    consumedIndexes.add(existingCodeIndex)
  } else {
    const codeCandidateIndex = nonVerificationSections.findIndex(
      section => (section.raw.match(/```/g) ?? []).length / 2 > 0
    )

    if (codeCandidateIndex !== -1) {
      codeSectionRaw = renameH2(
        nonVerificationSections[codeCandidateIndex].raw,
        chooseCodeHeading(nonVerificationSections[codeCandidateIndex].raw)
      )
      consumedIndexes.add(codeCandidateIndex)
    } else {
      codeSectionRaw = buildFallbackCodeSection(category)
      createdCodeExampleSection = true
    }
  }

  const existingWhyIndex = nonVerificationSections.findIndex(section =>
    isWhyItMattersHeading(section.heading.text)
  )

  let whySectionRaw = ''
  let createdWhySection = false

  if (existingWhyIndex !== -1) {
    whySectionRaw = renameH2(nonVerificationSections[existingWhyIndex].raw, 'Why It Matters')
    consumedIndexes.add(existingWhyIndex)
  } else {
    whySectionRaw = buildWhySection(data)
    createdWhySection = true
  }

  const remainingSections = nonVerificationSections
    .map((section, index) => ({ section, index }))
    .filter(entry => !consumedIndexes.has(entry.index))
    .map(entry => entry.section.raw)

  const nextBody =
    sectionsState.preamble.trimEnd() +
    (sectionsState.preamble.trim().length > 0 ? '\n\n' : '') +
    [
      codeSectionRaw.trimEnd(),
      whySectionRaw.trimEnd(),
      ...remainingSections.map(section => section.trimEnd()),
      verificationSection.trimEnd()
    ]
      .filter(Boolean)
      .join('\n\n') +
    '\n'

  const nextRaw = matter.stringify(nextBody, parsed.data)
  const changed = raw !== nextRaw

  if (write && changed) {
    fs.writeFileSync(filePath, nextRaw)
  }

  return {
    filePath,
    relativePath,
    changed,
    createdWhySection,
    createdCodeExampleSection,
    createdVerificationSection
  }
}

async function main() {
  const args = process.argv.slice(2)
  const write = getFlag(args, '--write')
  const files = collectRuleFiles(args.filter(arg => arg.endsWith('.mdx')))

  const results = files.map(filePath => fixRule(filePath, write))
  const changed = results.filter(result => result.changed)

  console.log('\n══════════════════════════════════════════════════')
  console.log('  RULE STRUCTURE CANONICALIZATION')
  console.log('══════════════════════════════════════════════════')
  console.log(`  Files checked : ${results.length}`)
  console.log(`  Files changed : ${changed.length}`)
  console.log(`  Mode          : ${write ? 'write' : 'report'}`)
  console.log('══════════════════════════════════════════════════\n')

  for (const result of changed) {
    const details: string[] = []
    if (result.createdCodeExampleSection) details.push('created Code Example section')
    if (result.createdWhySection) details.push('created Why It Matters section')
    if (result.createdVerificationSection) details.push('created Verification section')
    console.log(`- ${result.relativePath}${details.length > 0 ? ` (${details.join(', ')})` : ''}`)
  }

  if (!write && changed.length > 0) {
    console.log('\nRe-run with `--write` to apply these changes.\n')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
