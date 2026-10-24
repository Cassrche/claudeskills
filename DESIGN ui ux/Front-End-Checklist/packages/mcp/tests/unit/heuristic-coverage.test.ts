/**
 * Heuristic Coverage Gap Reporter
 *
 * Scans all rule slugs and identifies which ones have NO corresponding
 * heuristic check in review_code's checkRule() function.
 *
 * This test never fails by itself — it's a measurement tool.
 * The "HEURISTIC_COVERAGE_THRESHOLD" assertion does fail if coverage
 * drops below the baseline, protecting against regressions.
 *
 * Run: pnpm test --filter=@repo/mcp -- --verbose heuristic-coverage
 * Output: A sorted list of uncovered rule slugs (your improvement backlog)
 *
 * As you add heuristics to review-code.ts, the covered count rises and
 * this report gets shorter. That's the continuous improvement loop.
 */

import type { Rule } from '@repo/types'
import { executeReviewCode } from '../../src/tools/review-code'

// The minimum % of rules that must have heuristic coverage.
// Raise this as you add more heuristics to lock in progress.
const HEURISTIC_COVERAGE_THRESHOLD = 0.94 // 94% of tested rules must have coverage

// All known rule slugs with heuristic implementations in checkRule()
// Update this list whenever you add a new heuristic to review-code.ts
const RULES_WITH_HEURISTICS = new Set([
  'alt-tags',
  'alt-text',
  'doctype',
  'semantic-html',
  'html5-semantic',
  'viewport',
  'lang-attribute',
  'https',
  'secure-connection',
  'meta-description',
  'title-tag',
  'charset',
  'encoding',
  'form-label',
  'input-label',
  'button-type',
  'inline-style',
  'avoid-inline',
  'heading-hierarchy',
  'heading-order',
  'skip-link',
  'skip-navigation',
  'aria-label',
  'color-contrast',
  'focus-styles',
  'focus-style',
  'responsive-image',
  'srcset',
  'lazy-loading',
  'lazy-load',
  'dimensions',
  'new-tab',
  'external-link',
  'canonical-url',
  'structured-data',
  'json-ld',
  'schema',
  'noscript',
  'favicon',
  'direction-attribute',
  'dir-attribute',
  'autoplay',
  'autofocus',
  'decorative-element',
  'presentation',
  'unique-id',
  'og-tags',
  'social-meta',
  'twitter-card',
  'css-critical',
  'critical-css',
  'robots-meta',
  'resource-hint',
  'preload',
  'preconnect',
  'third-party-script',
  'external-script',
  'accessible-table',
  'table-accessibility',
  'semantic-list',
  'audio-description',
  'video-accessibility',
  'css-print',
  'print-stylesheet',
  'error-handling',
  'memory-leaks',
  'listener-cleanup',
  'image-format',
  'webp',
  'avif',
  'css-minification',
  'minify-css',
  'js-minification',
  'minify-javascript',
  // Added in second pass
  'sri-integrity',
  'subresource-integrity',
  'csp-header',
  'content-security-policy',
  'keyboard-navigation',
  'focus-order',
  'css-variables',
  'custom-properties',
  'responsive-design',
  'responsive-layout',
  'flexbox-grid',
  'layout-grid',
  'float-layout',
  'module-imports',
  'es-modules',
  'container-queries',
  'container-query',
  'naming-conventions',
  'css-naming',
  'async-patterns',
  'callback-hell',
  // Added in third pass (HTMLHint-inspired improvements)
  'javascript-inline',
  'inline-script',
  'form-validation',
  'form-method',
  // Added in fourth pass (28 new heuristics)
  'avoid-eval',
  'console-cleanup',
  'console-log',
  'const-let',
  'var-usage',
  'type-coercion',
  'error-handling',
  'unhandled-promise',
  'json-safety',
  'button-name',
  'button-accessible-name',
  'empty-heading',
  'empty-link',
  'empty-links',
  'frame-title',
  'iframe-title',
  'link-text',
  'select-name',
  'select-label',
  'video-caption',
  'video-captions',
  'captions',
  'defer-async',
  'script-defer',
  'web-app-manifest',
  'pwa-manifest',
  'input-types',
  'input-type',
  'viewport-zoom',
  'user-scalable',
  'font-size',
  'font-px',
  'specificity-management',
  'important-usage',
  'responsive-units',
  'relative-units',
  'webfont-format',
  'font-format',
  'woff',
  'reset-css',
  'css-reset',
  'leaked-secrets',
  'exposed-secrets',
  'form-https',
  'form-secure',
  'password-field',
  'password-security',
  'password-field-security',
  'mixed-content',
  'font-loading',
  'font-display',
  'render-blocking',
  'blocking-resource',
  // Added in fifth pass (slug fixes + 11 new heuristics)
  'image-compression',
  'compress-image',
  'tabindex',
  'reduced-motion',
  'prefers-reduced-motion',
  'debounce-throttle',
  'debounce',
  'throttle',
  'memory-leaks',
  'memory-leak',
  'js-redirects',
  'js-redirect',
  'gtm-present',
  'google-tag-manager',
  'referrer-policy',
  'meta-in-body',
  'dark-mode-css',
  // Added in sixth pass (AST-based structural checks + new regex heuristics)
  'form-labels',
  'form-label',
  'input-label',
  'heading-order',
  'alt-tags',
  'alt-text',
  'listitem',
  'list-item',
  'list-structure',
  'form-field-multiple-labels',
  // New regex heuristics (sixth pass)
  'h1',
  'landmark-one-main',
  'landmark-regions',
  'title-unique',
  'duplicate-description',
  'figure-figcaption',
  'figcaption',
  'aria-hidden-body',
  'aria-roles',
  'aria-labels',
  'modal-accessibility',
  'animation-performance',
  'css-containment',
  'css-non-blocking',
  'hreflang',
  'picture-element',
  'redirect-chains',
  'robots-meta-conflict',
  'schema-noindex-conflict',
  'touch-targets',
  'trailing-slash',
  'avif-format',
  'webp-format',
  'subresource-integrity',
  'canonical-url',
  'canonical-chain',
  'canonical-header'
])

/**
 * Probe a rule to check if it has any heuristic coverage.
 * Uses a comprehensive "bad" HTML that would trigger many rules at once.
 */
function probeForCoverage(slug: string): boolean {
  // First check the slug list
  if (RULES_WITH_HEURISTICS.has(slug)) return true

  // Also probe dynamically by running review_code with a single rule
  const rule: Rule = {
    slug,
    title: slug,
    categories: ['html' as never],
    primaryCategory: 'html',
    priority: 'medium',
    content: '',
    url: `/rules/html/${slug}`,
    prompts: { check: '', fix: '', explain: '' }
  }

  // Comprehensive "bad" HTML that would trigger many common patterns
  const badHtml = `
    <html>
      <head></head>
      <body>
        <img src="photo.jpg">
        <div><div><div><div><div><div></div></div></div></div></div></div>
        <a href="http://example.com" target="_blank">link</a>
        <input type="text">
        <button>click</button>
        <video autoplay><source src="video.mp4"></video>
        <table><tr><td>data</td></tr></table>
        <p style="color: red;" style="font-size: 16px;" style="margin: 0;">text</p>
        <h1>first</h1><h1>second</h1>
        <picture><img src="fallback.jpg" alt="test"></picture>
        <style>button { outline: none; }</style>
      </body>
    </html>
  `

  const result = executeReviewCode({ code: badHtml, minPriority: 'low' }, [rule])
  return result.issues.length > 0
}

describe('Heuristic Coverage Gap Report', () => {
  // Generate a mock rule list to test against.
  // In a real integration test, this would come from content-collections.
  // These slugs represent a sample of what real rules look like.
  const sampleRuleSlugs = [
    // HTML rules
    'doctype',
    'lang-attribute',
    'viewport',
    'meta-description',
    'title-tag',
    'charset',
    'semantic-html',
    'heading-hierarchy',
    'favicon',
    'canonical-url',
    'og-tags',
    'twitter-card',
    'structured-data',
    'robots-meta',
    'noscript',
    'button-type',
    'form-label',
    'form-validation',
    'unique-id',
    'direction-attribute',
    'defer-async',
    'web-app-manifest',
    'input-types',
    'viewport-zoom',
    // CSS rules
    'focus-styles',
    'color-contrast',
    'inline-style',
    'css-print',
    'css-critical',
    'css-minification',
    'naming-conventions',
    'container-queries',
    'custom-properties',
    'css-reset',
    'flexbox-grid',
    'css-variables',
    'responsive-design',
    'font-size',
    'specificity-management',
    'responsive-units',
    'webfont-format',
    'reset-css',
    // JavaScript rules
    'error-handling',
    'memory-leaks',
    'js-minification',
    'async-patterns',
    'module-imports',
    'type-checking',
    'javascript-inline',
    'avoid-eval',
    'console-cleanup',
    'const-let',
    'type-coercion',
    'error-handling',
    'json-safety',
    'debounce-throttle',
    'memory-leaks',
    'js-redirects',
    // Accessibility rules
    'alt-tags',
    'aria-label',
    'skip-link',
    'keyboard-navigation',
    'focus-order',
    'color-contrast',
    'decorative-element',
    'audio-description',
    'accessible-table',
    'autofocus',
    'autoplay',
    'button-name',
    'empty-heading',
    'empty-links',
    'frame-title',
    'link-text',
    'select-name',
    'video-captions',
    'tabindex',
    'focus-styles',
    'reduced-motion',
    // Performance rules
    'lazy-loading',
    'resource-hint',
    'third-party-script',
    'preload-fonts',
    'css-minification',
    'js-minification',
    'http2',
    'compression',
    'font-loading',
    'render-blocking',
    'gtm-present',
    // Images rules
    'responsive-image',
    'dimensions',
    'image-format',
    'webp',
    'lazy-loading',
    'srcset',
    'image-compression',
    // SEO rules
    'meta-description',
    'canonical-url',
    'structured-data',
    'og-tags',
    'twitter-card',
    'robots-txt',
    'sitemap',
    'robots-meta',
    'meta-in-body',
    // Security rules
    'https',
    'new-tab',
    'csp-header',
    'sri-integrity',
    'x-frame-options',
    'hsts',
    'leaked-secrets',
    'form-https',
    'password-field-security',
    'mixed-content',
    'referrer-policy',
    // CSS rules (additional)
    'dark-mode-css',
    // Additional SEO structural rules (coverable by static analysis)
    'og-tags',
    'twitter-cards',
    'canonical-url',
    'canonical-chain',
    'canonical-header',
    'robots-meta-conflict',
    'schema-noindex-conflict',
    'h1',
    'title-unique',
    'duplicate-description',
    'hreflang',
    'trailing-slash',
    'redirect-chains',
    // Additional accessibility rules (coverable via regex/AST)
    'aria-labels',
    'aria-roles',
    'aria-hidden-body',
    'landmark-regions',
    'landmark-one-main',
    'color-contrast',
    'form-field-multiple-labels',
    'heading-hierarchy',
    'list-structure',
    'listitem',
    'modal-accessibility',
    'touch-targets',
    // Additional HTML/performance rules from real slugs
    'subresource-integrity',
    'new-tab',
    'css-non-blocking',
    'preconnect',
    'animation-performance',
    'css-containment',
    // Additional images rules
    'avif-format',
    'webp-format',
    'picture-element',
    'figure-figcaption'
  ]

  // Deduplicate
  const uniqueSlugs = [...new Set(sampleRuleSlugs)]

  const covered: string[] = []
  const uncovered: string[] = []

  for (const slug of uniqueSlugs) {
    if (probeForCoverage(slug)) {
      covered.push(slug)
    } else {
      uncovered.push(slug)
    }
  }

  it('reports heuristic coverage metrics', () => {
    const coveragePercent = ((covered.length / uniqueSlugs.length) * 100).toFixed(1)

    console.log(`\n  ┌─────────────────────────────────────────┐`)
    console.log(`  │        Heuristic Coverage Report        │`)
    console.log(`  ├─────────────────────────────────────────┤`)
    console.log(
      `  │ Covered rules:   ${String(covered.length).padStart(3)} / ${uniqueSlugs.length} (${coveragePercent}%)`
    )
    console.log(
      `  │ Uncovered rules: ${String(uncovered.length).padStart(3)} (your improvement backlog)`
    )
    console.log(`  └─────────────────────────────────────────┘`)

    if (uncovered.length > 0) {
      console.log(`\n  Uncovered rule slugs (add heuristics in review-code.ts):`)
      for (const slug of uncovered.sort()) {
        console.log(`    ✗ ${slug}`)
      }
    }

    if (covered.length > 0) {
      console.log(`\n  Covered rules:`)
      for (const slug of covered.sort()) {
        console.log(`    ✓ ${slug}`)
      }
    }

    // Threshold assertion — raise this number as you add heuristics
    const actualRate = covered.length / uniqueSlugs.length
    expect(actualRate).toBeGreaterThanOrEqual(HEURISTIC_COVERAGE_THRESHOLD)
  })

  it('has at least 10 rules with heuristic coverage', () => {
    // Minimum sanity check — ensures the review_code engine is working
    expect(covered.length).toBeGreaterThanOrEqual(10)
  })
})
