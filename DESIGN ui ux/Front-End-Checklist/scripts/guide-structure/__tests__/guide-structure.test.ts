import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeGuideStructure } from '../../lib/guide-structure'

test('canonical how-to guide structure passes', () => {
  const issues = analyzeGuideStructure(
    'how-to',
    `
Intro paragraph.

## TL;DR

## Before You Start

## Steps

### Step 1

## Examples

## Common Mistakes

## Verification

## Related Checklist
`
  )

  assert.equal(issues.length, 0)
})

test('insight guide fails when sections are missing or out of order', () => {
  const issues = analyzeGuideStructure(
    'insight',
    `
Intro paragraph.

## Argument

## Context

## Practical Takeaway

## Related Checklist
`
  )

  assert.ok(issues.some(issue => issue.code === 'missing-section'))
  assert.ok(issues.some(issue => issue.code === 'section-order'))
})
