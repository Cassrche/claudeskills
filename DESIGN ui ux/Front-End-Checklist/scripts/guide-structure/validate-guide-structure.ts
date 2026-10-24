import path from 'node:path'
import { analyzeGuideStructure, collectGuideFiles, readGuideFile } from '../lib/guide-structure'

/**
 * Validates guide section order against the guide-type contract.
 *
 * Usage:
 *   pnpm validate:guide-structure
 *   pnpm validate:guide-structure path/to/guide.mdx
 */
function main() {
  const explicitFiles = process.argv.slice(2).filter(arg => arg.endsWith('.mdx'))
  const files = collectGuideFiles(explicitFiles)

  if (files.length === 0) {
    console.log('No guide files found.')
    return
  }

  const failures: string[] = []

  for (const filePath of files) {
    const { frontmatter, body } = readGuideFile(filePath)
    const issues = analyzeGuideStructure(String(frontmatter.type ?? ''), body)

    if (issues.length === 0) {
      continue
    }

    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
    failures.push(`${relativePath}\n${issues.map(issue => `  - ${issue.message}`).join('\n')}`)
  }

  if (failures.length > 0) {
    console.error(`Guide structure validation failed:\n\n${failures.join('\n\n')}`)
    process.exitCode = 1
    return
  }

  console.log(`Guide structure validation passed for ${files.length} guide(s).`)
}

main()
