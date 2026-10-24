import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import matter from 'gray-matter'
import { collectGuideFiles } from '../lib/guide-structure'

const SITE_URL = 'https://frontendchecklist.io'

interface GuideValidationResult {
  filePath: string
  issues: string[]
}

function stripCodeFences(body: string) {
  return body.replace(/```[\s\S]*?```/g, '')
}

function extractLinks(body: string) {
  return [...body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1])
}

function countWords(body: string) {
  return stripCodeFences(body)
    .replace(/[#>*_`-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

function countSentences(body: string) {
  return stripCodeFences(body)
    .split(/[.!?]+/)
    .map(part => part.trim())
    .filter(Boolean).length
}

function countSyllables(word: string) {
  const normalized = word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')

  const matches = normalized.match(/[aeiouy]{1,2}/g)
  return matches?.length ?? 1
}

function estimateGradeLevel(body: string) {
  const plainText = stripCodeFences(body)
  const words = plainText
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(Boolean)

  const wordCount = words?.length ?? 0
  const sentenceCount = Math.max(countSentences(body), 1)
  const syllableCount = words?.reduce((sum, word) => sum + countSyllables(word), 0) ?? 0

  if (wordCount === 0) {
    return 0
  }

  return 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59
}

function validateCoverImage(coverImage: string, repoRoot: string) {
  if (!coverImage.startsWith('/')) {
    return false
  }

  return existsSync(path.join(repoRoot, 'apps/web/public', coverImage))
}

export function validateGuideFile(
  filePath: string,
  repoRoot = process.cwd()
): GuideValidationResult {
  const raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
  const parsed = matter(raw)
  const body = parsed.content
  const fm = parsed.data as Record<string, unknown>
  const issues: string[] = []

  const requiredFields = [
    'title',
    'description',
    'slug',
    'type',
    'category',
    'tags',
    'publishedAt',
    'updatedAt',
    'coverImage',
    'featured',
    'relatedRules',
    'relatedChecklists',
    'relatedGuides'
  ]

  for (const field of requiredFields) {
    const value = fm[field]
    const isEmptyArray = Array.isArray(value) && value.length === 0
    if (value === undefined || value === null || value === '' || isEmptyArray) {
      issues.push(`missing required frontmatter field: ${field}`)
    }
  }

  if (typeof fm.coverImage !== 'string' || !validateCoverImage(fm.coverImage, repoRoot)) {
    issues.push('coverImage must point to an existing file in apps/web/public')
  }

  const links = extractLinks(body)
  const internalLinks = links.filter(link => link.startsWith('/') || link.startsWith(SITE_URL))
  const externalLinks = links.filter(
    link => /^https?:\/\//.test(link) && !link.startsWith(SITE_URL)
  )

  if (internalLinks.length < 2) {
    issues.push('guide body must include at least 2 internal links')
  }

  if (externalLinks.length < 1) {
    issues.push('guide body must include at least 1 authoritative external link')
  }

  if (countWords(body) < 180) {
    issues.push('guide body should contain at least 180 words of substantive content')
  }

  const estimatedGrade = estimateGradeLevel(body)
  if (estimatedGrade > 14) {
    issues.push(`estimated grade level is too high (${estimatedGrade.toFixed(1)} > 14.0)`)
  }

  return { filePath, issues }
}

function main() {
  const explicitFiles = process.argv.slice(2).filter(arg => arg.endsWith('.mdx'))
  const files = collectGuideFiles(explicitFiles)

  if (files.length === 0) {
    console.log('No guide files found.')
    return
  }

  const failing = files
    .map(filePath => validateGuideFile(filePath))
    .filter(result => result.issues.length > 0)

  if (failing.length > 0) {
    console.error('Guide publish validation failed:\n')
    for (const result of failing) {
      const relativePath = path.relative(process.cwd(), result.filePath).replace(/\\/g, '/')
      console.error(relativePath)
      for (const issue of result.issues) {
        console.error(`  - ${issue}`)
      }
      console.error('')
    }
    process.exitCode = 1
    return
  }

  console.log(`Guide publish validation passed for ${files.length} guide(s).`)
}

const entryFile = process.argv[1]

if (entryFile && import.meta.url === pathToFileURL(entryFile).href) {
  main()
}
