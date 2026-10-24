import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  analyzeRuleContract,
  analyzeRuleStructure,
  normalizeRuleStructureBody
} from '../../lib/rule-structure'
import { getProjectSupportedBrowsers, getRuleSupportData } from '../../lib/rule-support-data'
import { scoreRule } from '../score-rules'

test('canonical-url structure passes', () => {
  const body = `
Intro paragraph.

## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Best Practices

- Prefer semantic HTML.

## Verification

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.equal(analysis.issues.length, 0)
  assert.equal(analysis.canonical, true)
})

test('missing why it matters fails', () => {
  const body = `
## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Verification

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.deepEqual(
    analysis.issues.map(issue => issue.code),
    ['missing-why-it-matters']
  )
})

test('deprecated testing heading fails', () => {
  const body = `
## Code Examples

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Testing

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.ok(analysis.issues.some(issue => issue.code === 'deprecated-verification-heading'))
})

test('non-final testing section is not treated as the verification alias when verification exists', () => {
  const body = `
## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Testing

1. Exercise the component manually.

## Verification

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.equal(analysis.issues.length, 0)

  const normalized = normalizeRuleStructureBody(body)
  assert.equal(normalized.changed, false)
})

test('headings inside code fences are ignored', () => {
  const body = `
## Code Example

\`\`\`md
## Testing
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Verification

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.equal(analysis.issues.length, 0)
})

test('inline metadata prose fails structure validation', () => {
  const body = `
Intro paragraph.

See also [Respect reduced motion preferences](/en/rules/accessibility/reduced-motion) and [Provide alternatives to parallax effects](/en/rules/accessibility/parallax-effects). Reference: [W3C WAI: WCAG Overview](https://www.w3.org/WAI/standards-guidelines/wcag/).

## Code Example

\`\`\`css
.card { transition: none; }
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Verification

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.ok(analysis.issues.some(issue => issue.code === 'inline-metadata-prose'))
})

test('natural inline links do not fail structure validation', () => {
  const body = `
Intro paragraph that references [WCAG 2.2](https://www.w3.org/TR/WCAG22/) in a normal sentence.

## Code Example

\`\`\`css
.card { transition: none; }
\`\`\`

## Why It Matters

This rule often overlaps with [Respect reduced motion preferences](/en/rules/accessibility/reduced-motion) when animation and motion settings need to stay aligned.

## Verification

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.ok(!analysis.issues.some(issue => issue.code === 'inline-metadata-prose'))
})

test('standalone reference line fails structure validation', () => {
  const body = `
Intro paragraph.

Reference: [W3C WAI: WCAG Overview](https://www.w3.org/WAI/standards-guidelines/wcag/).

## Code Example

\`\`\`css
.card { transition: none; }
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Verification

1. Check the rendered output.
`

  const analysis = analyzeRuleStructure(body)
  assert.ok(analysis.issues.some(issue => issue.code === 'inline-metadata-prose'))
})

test('sections after verification fail', () => {
  const body = `
## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Verification

1. Check the rendered output.

## Common Mistakes

- Do not hide focus styles.
`

  const analysis = analyzeRuleStructure(body)
  assert.ok(analysis.issues.some(issue => issue.code === 'verification-not-last'))
})

test('normalizer renames testing and moves trailing sections before verification', () => {
  const body = `
Intro paragraph.

## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Testing

1. Check the rendered output.

## Common Mistakes

- Do not hide focus styles.
`

  const normalized = normalizeRuleStructureBody(body)

  assert.equal(normalized.changed, true)
  assert.deepEqual(normalized.renamedVerificationHeadings, ['Testing'])
  assert.deepEqual(normalized.movedHeadingsBeforeVerification, ['Common Mistakes'])
  assert.match(normalized.body, /## Why It Matters[\s\S]*## Common Mistakes[\s\S]*## Verification/)
  assert.match(normalized.body, /Do not hide focus styles\./)
})

test('verification split is detected when automated and manual checks are present', () => {
  const body = `
Intro paragraph.

## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Verification

### Automated Checks

- Run axe in CI.

### Manual Checks

- Validate keyboard behavior in the browser.
`

  const analysis = analyzeRuleContract({
    category: 'accessibility',
    slug: 'sample-rule',
    body,
    resources: [{ name: 'axe', type: 'tool' }]
  })

  assert.equal(analysis.hasVerificationSplit, true)
  assert.equal(analysis.hasVerificationAutomatedChecks, true)
  assert.equal(analysis.hasVerificationManualChecks, true)
})

test('exceptions section before verification is valid and tracked', () => {
  const body = `
Intro paragraph.

## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Exceptions

- Decorative images may use empty alt text.

## Verification

1. Check the rendered output.
`

  const structure = analyzeRuleStructure(body)
  const contract = analyzeRuleContract({
    category: 'accessibility',
    slug: 'alt-text',
    body
  })

  assert.equal(structure.issues.length, 0)
  assert.equal(contract.hasExceptionsSection, true)
  assert.equal(contract.missingRecommendations.includes('exceptions'), false)
})

test('simple rules are not forced into contract conditional sections', () => {
  const body = `
Intro paragraph.

## Code Example

\`\`\`html
<button>Save</button>
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Verification

1. Check the rendered output.
`

  const contract = analyzeRuleContract({
    category: 'html',
    slug: 'button-name',
    title: 'Use semantic buttons',
    body
  })

  assert.equal(contract.expectsExceptions, false)
  assert.equal(contract.expectsVerificationSplit, false)
  assert.equal(contract.expectsSupportNotes, false)
  assert.equal(contract.expectsStandardsVisibility, false)
})

test('compatibility-sensitive rules report missing support notes', () => {
  const body = `
Intro paragraph.

## Code Example

\`\`\`css
.grid { display: grid; grid-template-columns: subgrid; }
\`\`\`

## Why It Matters

This keeps the rule actionable.

## Verification

1. Check the rendered output.
`

  const contract = analyzeRuleContract({
    category: 'css',
    slug: 'subgrid',
    title: 'Use CSS subgrid',
    body,
    sources: [{ title: 'Can I Use: subgrid', type: 'guide' }]
  })

  assert.equal(contract.expectsSupportNotes, true)
  assert.equal(contract.missingRecommendations.includes('supportNotes'), true)
})

test('score awards contract dimensions when conditional sections are present', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rule-score-'))
  const categoryDir = path.join(tempDir, 'security')
  fs.mkdirSync(categoryDir, { recursive: true })
  const filePath = path.join(categoryDir, 'sample-rule.mdx')
  fs.writeFileSync(
    filePath,
    `---
title: "Set a Permissions Policy header"
description: "Set a Permissions-Policy header to restrict powerful browser features."
categories: ['security']
priority: 'high'
difficulty: 'intermediate'
estimatedTime: 10
tldr:
  - "One"
  - "Two"
  - "Three"
whyItMatters: "Restricting browser features reduces attack surface."
aiContext: "Use when reviewing browser feature access and response headers."
relatedRules:
  - slug: permissions-policy
    reason: "Related"
  - slug: referrer-policy
    reason: "Related"
sources:
  - title: "MDN: Permissions Policy"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy"
    type: "mdn"
  - title: "OWASP HTTP Headers Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html"
    type: "guide"
resources:
  - name: "Mozilla Observatory"
    url: "https://observatory.mozilla.org/"
    type: "tool"
prompts:
  check: "Inspect response headers for missing or weak Permissions-Policy directives."
  fix: "Set a restrictive Permissions-Policy header and keep only required capabilities enabled."
  explain: "Explain how Permissions-Policy reduces browser feature abuse."
  codeReview: "Review response headers and browser feature restrictions."
---

Short intro.

## Code Example

\`\`\`http
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
\`\`\`

## Why It Matters

Permissions-Policy reduces browser feature abuse and narrows the attack surface.

## Browser Support

- Verify support and syntax against current browser documentation before rollout.

## Exceptions

- Leave a feature enabled only when the product genuinely requires it and the dependency is documented.

## Verification

### Automated Checks

- Check headers in CI with curl or an automated security scanner.

### Manual Checks

- Confirm required browser features still work in the target flow.
`
  )

  const score = scoreRule(filePath)
  assert.ok(score)
  assert.equal(score?.dimensions.find(d => d.name === 'exceptions')?.score, 4)
  assert.equal(score?.dimensions.find(d => d.name === 'verificationSplit')?.score, 4)
  assert.equal(score?.dimensions.find(d => d.name === 'standardsVisibility')?.score, 4)
})

test('browserslist policy resolves from repo config', () => {
  const browsers = getProjectSupportedBrowsers(process.cwd())
  assert.ok(browsers.length > 0)
  assert.ok(browsers.some(browser => browser.startsWith('chrome ')))
  assert.ok(browsers.some(browser => browser.startsWith('firefox ')))
})

test('package-backed support data resolves for mapped feature rules', () => {
  const support = getRuleSupportData('subgrid', process.cwd())
  assert.ok(support)
  assert.equal(support?.featureId, 'css.properties.grid-template-columns.subgrid')
  assert.ok((support?.targetBrowsers.length ?? 0) > 0)
})
