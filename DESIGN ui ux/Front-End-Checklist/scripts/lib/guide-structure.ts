import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

export const GUIDES_DIR = path.join(process.cwd(), 'packages/content/guides/en')

const GUIDE_SECTION_ORDER = {
  'how-to': [
    'TL;DR',
    'Before You Start',
    'Steps',
    'Examples',
    'Common Mistakes',
    'Verification',
    'Related Checklist'
  ],
  insight: ['Context', 'Argument', 'Examples', 'Practical Takeaway', 'Related Checklist']
} as const

type GuideType = keyof typeof GUIDE_SECTION_ORDER

export interface GuideHeading {
  text: string
  depth: number
}

export interface GuideStructureIssue {
  code: 'unknown-type' | 'missing-section' | 'section-order' | 'final-section'
  message: string
}

const parser = unified().use(remarkParse).use(remarkMdx)

function normalizeHeading(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function extractInlineText(node: any): string {
  if (!node) return ''

  if (typeof node.value === 'string') {
    return node.value
  }

  if (Array.isArray(node.children)) {
    return node.children.map(extractInlineText).join('')
  }

  return ''
}

export function extractGuideHeadings(body: string): GuideHeading[] {
  const tree = parser.parse(body)
  const headings: GuideHeading[] = []

  visit(tree as any, 'heading', (node: any) => {
    headings.push({
      text: normalizeHeading(extractInlineText(node)),
      depth: node.depth
    })
  })

  return headings
}

export function analyzeGuideStructure(type: string, body: string): GuideStructureIssue[] {
  const sections = GUIDE_SECTION_ORDER[type as GuideType]

  if (!sections) {
    return [{ code: 'unknown-type', message: `Unknown guide type "${type}".` }]
  }

  const h2Headings = extractGuideHeadings(body)
    .filter(heading => heading.depth === 2)
    .map(heading => heading.text)

  const issues: GuideStructureIssue[] = []
  let previousIndex = -1

  for (const requiredSection of sections) {
    const index = h2Headings.indexOf(requiredSection)

    if (index === -1) {
      issues.push({
        code: 'missing-section',
        message: `Missing required section "${requiredSection}".`
      })
      continue
    }

    if (index < previousIndex) {
      issues.push({
        code: 'section-order',
        message: `Section "${requiredSection}" appears out of order.`
      })
    }

    previousIndex = Math.max(previousIndex, index)
  }

  if (h2Headings.at(-1) !== 'Related Checklist') {
    issues.push({
      code: 'final-section',
      message: 'The final H2 section must be "Related Checklist".'
    })
  }

  return issues
}

export function collectGuideFiles(explicitFiles: string[] = []): string[] {
  if (explicitFiles.length > 0) {
    return explicitFiles.map(filePath => path.resolve(filePath))
  }

  if (!existsSync(GUIDES_DIR)) {
    return []
  }

  return readdirSync(GUIDES_DIR)
    .filter(file => file.endsWith('.mdx'))
    .map(file => path.join(GUIDES_DIR, file))
}

export function readGuideFile(filePath: string) {
  const raw = readFileSync(filePath, 'utf-8').replace(/\0/g, '')
  const parsed = matter(raw)

  return {
    frontmatter: parsed.data as Record<string, unknown>,
    body: parsed.content
  }
}
