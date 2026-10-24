/**
 * Normalizes Front-End Checklist rule verification sections.
 *
 * Usage:
 *   pnpm tsx scripts/rule-structure/normalize-rule-structure.ts --report
 *   pnpm tsx scripts/rule-structure/normalize-rule-structure.ts --write
 *   pnpm tsx scripts/rule-structure/normalize-rule-structure.ts --write --category=security
 *   pnpm tsx scripts/rule-structure/normalize-rule-structure.ts path/to/rule.mdx --write
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  collectRuleFiles,
  normalizeRuleStructureBody,
  RULES_DIR,
  readRuleFile
} from '../lib/rule-structure'

interface NormalizationResult {
  filePath: string
  relativePath: string
  renamedVerificationHeadings: string[]
  movedHeadingsBeforeVerification: string[]
  changed: boolean
}

function getFlagValue(args: string[], flag: string): string[] {
  const values: string[] = []

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg.startsWith(`${flag}=`)) {
      values.push(arg.slice(flag.length + 1))
      continue
    }

    if (arg === flag && args[index + 1] && !args[index + 1].startsWith('--')) {
      values.push(args[index + 1])
      index += 1
    }
  }

  return values
}

function resolveFiles(args: string[]): string[] {
  const explicitFiles = args.filter(arg => arg.endsWith('.mdx'))
  const categories = getFlagValue(args, '--category')

  let files = collectRuleFiles(explicitFiles)

  if (categories.length > 0) {
    const allowed = new Set(categories)
    files = files.filter(filePath => {
      const relativePath = path.relative(RULES_DIR, filePath).replace(/\\/g, '/')
      return allowed.has(relativePath.split('/')[0] ?? '')
    })
  }

  return files
}

function normalizeFile(filePath: string, write: boolean): NormalizationResult {
  const raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
  const { frontmatter, body } = readRuleFile(filePath)
  const normalized = normalizeRuleStructureBody(body)
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/')

  if (write && normalized.changed) {
    writeFileSync(filePath, `${frontmatter}${normalized.body}`)
  }

  return {
    filePath,
    relativePath,
    renamedVerificationHeadings: normalized.renamedVerificationHeadings,
    movedHeadingsBeforeVerification: normalized.movedHeadingsBeforeVerification,
    changed: normalized.changed && raw !== `${frontmatter}${normalized.body}`
  }
}

async function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const files = resolveFiles(args)
  const results = files
    .map(filePath => normalizeFile(filePath, write))
    .filter(result => result.changed)

  console.log('\n══════════════════════════════════════════════════')
  console.log('  RULE STRUCTURE NORMALIZATION')
  console.log('══════════════════════════════════════════════════')
  console.log(`  Files checked : ${files.length}`)
  console.log(`  Files changed : ${results.length}`)
  console.log(`  Mode          : ${write ? 'write' : 'report'}`)
  console.log('══════════════════════════════════════════════════\n')

  for (const result of results) {
    const details: string[] = []
    if (result.renamedVerificationHeadings.length > 0) {
      details.push(`renamed ${Array.from(new Set(result.renamedVerificationHeadings)).join(', ')}`)
    }
    if (result.movedHeadingsBeforeVerification.length > 0) {
      details.push(`moved ${result.movedHeadingsBeforeVerification.join(', ')} before Verification`)
    }

    console.log(`- ${result.relativePath}`)
    if (details.length > 0) {
      console.log(`  ${details.join('; ')}`)
    }
  }

  if (results.length === 0) {
    console.log('No rule files required normalization.\n')
  } else if (!write) {
    console.log('\nRe-run with `--write` to apply these changes.\n')
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
