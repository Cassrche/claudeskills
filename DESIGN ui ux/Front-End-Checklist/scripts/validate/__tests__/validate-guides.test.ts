import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { validateGuideFile } from '../validate-guides'

test('fails when guide cover image is missing', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'guide-cover-'))
  const contentDir = path.join(tempRoot, 'packages', 'content', 'guides', 'en')
  const filePath = path.join(contentDir, 'guide.mdx')

  mkdirSync(contentDir, { recursive: true })
  writeFileSync(
    filePath,
    `---
title: Test
description: Test description
slug: test
type: how-to
category: performance
tags:
  - audit
publishedAt: 2026-03-13
updatedAt: 2026-03-13
coverImage: /guides/missing.svg
featured: false
relatedRules:
  - performance/largest-contentful-paint
relatedChecklists:
  - core-web-vitals
relatedGuides:
  - another-guide
---
Intro.

## TL;DR

[Internal](/guides/test) and [Checklist](/checklists/core-web-vitals) plus [External](https://web.dev/articles/vitals).

## Before You Start

## Steps

## Examples

## Common Mistakes

## Verification

## Related Checklist
`
  )

  const result = validateGuideFile(filePath, tempRoot)
  rmSync(tempRoot, { recursive: true, force: true })

  assert.ok(result.issues.some(issue => issue.includes('coverImage')))
})

test('fails when guide is underlinked and missing citations', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'guide-links-'))
  const contentDir = path.join(tempRoot, 'packages', 'content', 'guides', 'en')
  const publicDir = path.join(tempRoot, 'apps', 'web', 'public', 'guides')
  const filePath = path.join(contentDir, 'guide.mdx')

  mkdirSync(contentDir, { recursive: true })
  mkdirSync(publicDir, { recursive: true })
  writeFileSync(path.join(publicDir, 'cover.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  writeFileSync(
    filePath,
    `---
title: Test
description: Test description
slug: test
type: insight
category: seo
tags:
  - quality
publishedAt: 2026-03-13
updatedAt: 2026-03-13
coverImage: /guides/cover.svg
featured: false
relatedRules:
  - seo/quality
relatedChecklists:
  - comprehensive-audit
relatedGuides:
  - another-guide
---
This sentence is intentionally simple.

## Context

## Argument

## Examples

## Practical Takeaway

## Related Checklist
`
  )

  const result = validateGuideFile(filePath, tempRoot)
  rmSync(tempRoot, { recursive: true, force: true })

  assert.ok(result.issues.some(issue => issue.includes('internal links')))
  assert.ok(result.issues.some(issue => issue.includes('external link')))
})
