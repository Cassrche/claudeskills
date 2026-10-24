import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  analyzeRuleInlineLinks,
  buildExternalLinkCandidates,
  buildInternalLinkCandidates
} from '../../lib/rule-inline-links'
import { readRuleFile } from '../../lib/rule-structure'
import type { InlineLinkPolicy } from '../../validate/inline-link-policy'

test('analyzer ignores frontmatter links when the body is extracted first', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'inline-link-rule-'))
  const filePath = path.join(dir, 'rule.mdx')

  writeFileSync(
    filePath,
    `---
title: Sample
sources:
  - title: MDN
    url: https://developer.mozilla.org/en-US/docs/Web/CSS
---
Intro paragraph with [WCAG](https://www.w3.org/TR/WCAG22/) inline.
`
  )

  const { body } = readRuleFile(filePath)
  const analysis = analyzeRuleInlineLinks(body)

  rmSync(dir, { recursive: true, force: true })

  assert.equal(analysis.totalLinkCount, 1)
  assert.equal(analysis.externalLinkCount, 1)
})

test('analyzer distinguishes internal rule links from external links', () => {
  const analysis = analyzeRuleInlineLinks(
    `Intro with [WCAG](https://www.w3.org/TR/WCAG22/) and [Reduced motion](/en/rules/accessibility/reduced-motion).`,
    {
      allowedPrimaryDomains: ['w3.org']
    }
  )

  assert.equal(analysis.totalLinkCount, 2)
  assert.equal(analysis.externalLinkCount, 1)
  assert.equal(analysis.internalRuleLinkCount, 1)
  assert.equal(analysis.classification, 'balanced')
})

test('analyzer flags repeated destinations in a paragraph', () => {
  const analysis = analyzeRuleInlineLinks(
    `Intro with [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS) and [the same MDN page](https://developer.mozilla.org/en-US/docs/Web/CSS) repeated again.`
  )

  assert.ok(
    analysis.warnings.some(warning => warning.code === 'repeated-destinations-in-paragraph')
  )
  assert.equal(analysis.classification, 'too_dense')
})

test('analyzer flags formulaic metadata paragraphs', () => {
  const analysis = analyzeRuleInlineLinks(
    `See also [Reduced motion](/en/rules/accessibility/reduced-motion).\n\n## Why It Matters\n\nReference: [WCAG](https://www.w3.org/TR/WCAG22/).`
  )

  assert.ok(analysis.warnings.some(warning => warning.code === 'formulaic-metadata-prose'))
})

test('candidate builders prefer unused authoritative and trusted secondary links', () => {
  const policy: InlineLinkPolicy = {
    trustedSecondaryDomains: new Set(['patterns.dev']),
    trustedSecondaryUrls: new Set<string>()
  }
  const analysis = analyzeRuleInlineLinks(
    `Intro with [MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading).`,
    {
      allowedPrimaryDomains: ['developer.mozilla.org'],
      knownSourceUrls: ['https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading'],
      policy
    }
  )

  const externalCandidates = buildExternalLinkCandidates({
    analysis,
    allowedPrimaryDomains: ['developer.mozilla.org'],
    policy,
    resources: [
      {
        name: 'Patterns.dev: Import On Visibility',
        url: 'https://www.patterns.dev/vanilla/import-on-visibility/',
        type: 'article'
      }
    ],
    sources: [
      {
        title: 'MDN: Lazy loading',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading',
        authority: 'primary'
      },
      {
        title: 'MDN: Intersection Observer API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API',
        authority: 'primary'
      }
    ]
  })
  const internalCandidates = buildInternalLinkCandidates({
    analysis,
    relatedRules: [
      {
        title: 'Import on interaction',
        href: '/en/rules/performance/import-on-interaction'
      }
    ]
  })

  assert.equal(externalCandidates[0]?.label, 'MDN: Intersection Observer API')
  assert.ok(
    externalCandidates.some(candidate => candidate.label === 'Patterns.dev: Import On Visibility')
  )
  assert.equal(internalCandidates[0]?.href, '/en/rules/performance/import-on-interaction')
  assert.equal(internalCandidates[0]?.kind, 'internal')
})

test('candidate builders suggest linking a named tool mention on first mention', () => {
  const analysis = analyzeRuleInlineLinks(
    'Run a site crawl with Screaming Frog before checking duplicate descriptions.'
  )

  const externalCandidates = buildExternalLinkCandidates({
    analysis,
    resources: [
      {
        name: 'Screaming Frog',
        url: 'https://www.screamingfrog.co.uk/seo-spider/',
        type: 'tool'
      }
    ],
    tools: [
      {
        name: 'Google Search Console',
        url: 'https://search.google.com/search-console/about'
      }
    ]
  })

  assert.equal(externalCandidates[0]?.label, 'Screaming Frog')
  assert.match(externalCandidates[0]?.reason ?? '', /mentioned in prose without a link/i)
})
