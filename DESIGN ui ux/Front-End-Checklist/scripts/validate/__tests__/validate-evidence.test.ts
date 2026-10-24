import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { EVIDENCE_POLICY_PATH, loadEvidencePolicy } from '../evidence-policy'
import { validateEvidenceRule } from '../validate-evidence'

const policy = loadEvidencePolicy(path.join(process.cwd(), EVIDENCE_POLICY_PATH))

function writeRule(category: string, frontmatter: string, body = 'Body text'): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'evidence-rule-'))
  const categoryDir = path.join(dir, category)
  const filePath = path.join(categoryDir, 'rule.mdx')

  mkdirSync(categoryDir, { recursive: true })
  writeFileSync(filePath, `---\n${frontmatter}\n---\n${body}\n`)
  return filePath
}

function cleanup(filePath: string) {
  rmSync(path.dirname(path.dirname(filePath)), { recursive: true, force: true })
}

test('fails when a rule has no primary source', () => {
  const filePath = writeRule(
    'html',
    `title: Rule
sources:
  - id: a
    title: Example A
    url: https://example.com/a
    type: guide
    role: reference
    authority: secondary
  - id: b
    title: Example B
    url: https://example.com/b
    type: guide
    role: implementation
    authority: secondary`
  )

  const result = validateEvidenceRule(filePath, policy)
  cleanup(filePath)

  assert.ok(result)
  assert.match(result.issues.join('\n'), /requires at least 1 primary source/)
})

test('fails when all sources share one role', () => {
  const filePath = writeRule(
    'html',
    `title: Rule
sources:
  - id: a
    title: WHATWG HTML
    url: https://html.spec.whatwg.org/
    type: spec
    role: standard
    authority: primary
  - id: b
    title: W3C HTML
    url: https://www.w3.org/TR/html/
    type: spec
    role: standard
    authority: primary`
  )

  const result = validateEvidenceRule(filePath, policy)
  cleanup(filePath)

  assert.ok(result)
  assert.match(result.issues.join('\n'), /distinct source roles/)
})

test('fails when duplicate source ids are present', () => {
  const filePath = writeRule(
    'accessibility',
    `title: Touch targets
sources:
  - id: wcag
    title: WCAG
    url: https://www.w3.org/TR/WCAG22/#target-size-minimum
    type: wcag
    role: standard
    authority: primary
  - id: wcag
    title: MDN
    url: https://developer.mozilla.org/en-US/docs/Web/Accessibility
    type: mdn
    role: reference
    authority: primary`,
    'Targets should be at least 24px by 24px.'
  )

  const result = validateEvidenceRule(filePath, policy)
  cleanup(filePath)

  assert.ok(result)
  assert.match(result.issues.join('\n'), /duplicate source id/)
})

test('fails search-facing rules without a Google Search Central or spec source', () => {
  const filePath = writeRule(
    'seo',
    `title: Canonical URLs
description: Handle canonical-url and crawl signals correctly.
sources:
  - id: a
    title: Example A
    url: https://example.com/a
    type: guide
    role: reference
    authority: secondary
  - id: b
    title: Example B
    url: https://example.com/b
    type: guide
    role: implementation
    authority: secondary`
  )

  const result = validateEvidenceRule(filePath, policy)
  cleanup(filePath)

  assert.ok(result)
  assert.match(result.issues.join('\n'), /Google Search Central or spec source/)
})

test('fails compatibility claims without a structured support source', () => {
  const filePath = writeRule(
    'css',
    `title: Browser support
sources:
  - id: guide-a
    title: Example Guide A
    url: https://example.com/a
    type: guide
    role: reference
    authority: secondary
  - id: guide-b
    title: Example Guide B
    url: https://example.com/b
    type: guide
    role: implementation
    authority: secondary`,
    'Browser support varies across Chrome and Safari.'
  )

  const result = validateEvidenceRule(filePath, policy)
  cleanup(filePath)

  assert.ok(result)
  assert.match(result.issues.join('\n'), /structured or standards-based source/)
})
