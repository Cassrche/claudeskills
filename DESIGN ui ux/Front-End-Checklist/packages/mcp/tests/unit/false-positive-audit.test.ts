/**
 * False-Positive Audit for review_code
 *
 * Tests every heuristic in checkRule() against "exemplary" code that follows
 * all best practices. Any issue that fires here is a false positive — the
 * heuristic is too aggressive and needs tightening.
 *
 * Run: pnpm --filter=@repo/mcp exec jest --testPathPattern="false-positive"
 *
 * A failure means a heuristic fires on good code. Fix the heuristic, not the fixture.
 */

import type { Rule } from '@repo/types'
import { executeReviewCode } from '../../src/tools/review-code'

function makeRule(
  slug: string,
  category: string,
  priority: 'critical' | 'high' | 'medium' | 'low'
): Rule {
  return {
    slug,
    title: slug,
    categories: [category as never],
    primaryCategory: category,
    priority,
    content: '',
    url: `/rules/${category}/${slug}`,
    prompts: { check: '', fix: '', explain: '' }
  }
}

// Every rule that has a heuristic
const ALL_RULES: Rule[] = [
  makeRule('alt-tags', 'accessibility', 'critical'),
  makeRule('alt-text', 'accessibility', 'critical'),
  makeRule('doctype', 'html', 'critical'),
  makeRule('semantic-html', 'html', 'high'),
  makeRule('html5-semantic', 'html', 'high'),
  makeRule('viewport', 'html', 'high'),
  makeRule('lang-attribute', 'html', 'high'),
  makeRule('https', 'security', 'critical'),
  makeRule('meta-description', 'seo', 'high'),
  makeRule('title-tag', 'html', 'high'),
  makeRule('charset', 'html', 'high'),
  makeRule('form-label', 'accessibility', 'high'),
  makeRule('form-validation', 'html', 'medium'),
  makeRule('button-type', 'html', 'medium'),
  makeRule('inline-style', 'css', 'low'),
  makeRule('javascript-inline', 'javascript', 'medium'),
  makeRule('heading-hierarchy', 'html', 'high'),
  makeRule('skip-link', 'accessibility', 'high'),
  makeRule('aria-label', 'accessibility', 'high'),
  makeRule('color-contrast', 'css', 'critical'),
  makeRule('focus-styles', 'css', 'high'),
  makeRule('responsive-image', 'images', 'high'),
  makeRule('srcset', 'images', 'medium'),
  makeRule('lazy-loading', 'performance', 'medium'),
  makeRule('dimensions', 'images', 'medium'),
  makeRule('new-tab', 'security', 'high'),
  makeRule('canonical-url', 'seo', 'high'),
  makeRule('structured-data', 'seo', 'medium'),
  makeRule('og-tags', 'seo', 'medium'),
  makeRule('twitter-card', 'seo', 'low'),
  makeRule('resource-hint', 'performance', 'medium'),
  makeRule('third-party-script', 'performance', 'high'),
  makeRule('error-handling', 'javascript', 'high'),
  makeRule('favicon', 'html', 'medium'),
  makeRule('sri-integrity', 'security', 'high'),
  makeRule('csp-header', 'security', 'high'),
  makeRule('keyboard-navigation', 'accessibility', 'critical'),
  makeRule('focus-order', 'accessibility', 'high'),
  makeRule('tabindex', 'accessibility', 'high'),
  makeRule('css-variables', 'css', 'medium'),
  makeRule('responsive-design', 'css', 'high'),
  makeRule('flexbox-grid', 'css', 'medium'),
  makeRule('module-imports', 'javascript', 'medium'),
  makeRule('naming-conventions', 'css', 'low'),
  makeRule('async-patterns', 'javascript', 'medium'),
  makeRule('unique-id', 'html', 'high'),
  makeRule('avoid-eval', 'javascript', 'critical'),
  makeRule('console-cleanup', 'javascript', 'medium'),
  makeRule('const-let', 'javascript', 'medium'),
  makeRule('type-coercion', 'javascript', 'medium'),
  makeRule('json-safety', 'javascript', 'high'),
  makeRule('button-name', 'accessibility', 'critical'),
  makeRule('empty-heading', 'accessibility', 'high'),
  makeRule('empty-links', 'accessibility', 'high'),
  makeRule('frame-title', 'accessibility', 'high'),
  makeRule('link-text', 'accessibility', 'medium'),
  makeRule('select-name', 'accessibility', 'high'),
  makeRule('video-captions', 'accessibility', 'high'),
  makeRule('defer-async', 'html', 'high'),
  makeRule('web-app-manifest', 'html', 'medium'),
  makeRule('input-types', 'html', 'medium'),
  makeRule('viewport-zoom', 'accessibility', 'critical'),
  makeRule('font-size', 'css', 'medium'),
  makeRule('specificity-management', 'css', 'medium'),
  makeRule('responsive-units', 'css', 'medium'),
  makeRule('webfont-format', 'css', 'medium'),
  makeRule('reset-css', 'css', 'low'),
  makeRule('leaked-secrets', 'security', 'critical'),
  makeRule('form-https', 'security', 'critical'),
  makeRule('password-field-security', 'security', 'high'),
  makeRule('mixed-content', 'security', 'critical'),
  makeRule('font-loading', 'performance', 'high'),
  makeRule('render-blocking', 'performance', 'high'),
  makeRule('image-compression', 'images', 'high'),
  makeRule('reduced-motion', 'accessibility', 'high'),
  makeRule('debounce-throttle', 'javascript', 'medium'),
  makeRule('memory-leaks', 'javascript', 'high'),
  makeRule('js-redirects', 'performance', 'medium'),
  makeRule('gtm-present', 'performance', 'medium'),
  makeRule('referrer-policy', 'security', 'medium'),
  makeRule('meta-in-body', 'seo', 'high'),
  makeRule('dark-mode-css', 'css', 'medium'),
  makeRule('css-critical', 'performance', 'high'),
  makeRule('robots-meta', 'seo', 'medium'),
  makeRule('noscript', 'html', 'medium'),
  makeRule('direction-attribute', 'html', 'medium'),
  makeRule('autoplay', 'accessibility', 'medium'),
  makeRule('autofocus', 'accessibility', 'medium'),
  makeRule('decorative-element', 'accessibility', 'medium'),
  makeRule('audio-description', 'accessibility', 'high'),
  makeRule('accessible-table', 'accessibility', 'high'),
  makeRule('semantic-list', 'html', 'low'),
  makeRule('css-print', 'css', 'low'),
  makeRule('css-minification', 'css', 'medium'),
  makeRule('js-minification', 'javascript', 'medium'),
  makeRule('memory-leaks', 'javascript', 'high'),
  makeRule('image-format', 'images', 'medium')
]

function issuesIn(code: string, focus?: string[]): string[] {
  return executeReviewCode(
    { code, focus: focus as never, minPriority: 'low' },
    ALL_RULES
  ).issues.map(i => i.rule)
}

// ─── Exemplary HTML page ─────────────────────────────────────────────────────
// A complete, production-quality HTML document that satisfies every rule.
const GOOD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="A well-structured accessible web page">
  <meta name="robots" content="index, follow">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta property="og:title" content="Page Title">
  <meta property="og:description" content="Page description for social sharing">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
  <title>Page Title</title>
  <link rel="canonical" href="https://example.com/page">
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <link rel="manifest" href="/manifest.json">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preload" href="/critical.css" as="style">
  <link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'">
  <script src="https://cdn.example.com/lib.js" async integrity="sha384-abc123" crossorigin="anonymous"></script>
  <script src="/app.js" defer></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-size: 1rem; color: var(--color-text); }
    :focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
    @media (prefers-color-scheme: dark) { :root { --color-text: #fff; } }
    @media print { body { font-size: 12pt; } }
  </style>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <header>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About us</a></li>
      </ul>
    </nav>
  </header>
  <main id="main">
    <h1>Page Title</h1>
    <h2>Section heading</h2>
    <p>Content paragraph with a <a href="/more">link to more details</a>.</p>
    <img src="photo.jpg" alt="A scenic mountain view" width="800" height="600" loading="lazy" srcset="photo-2x.jpg 2x">
    <picture>
      <source srcset="photo.avif" type="image/avif">
      <source srcset="photo.webp" type="image/webp">
      <img src="photo.jpg" alt="Landscape" width="800" height="600">
    </picture>
    <form action="/submit" method="post">
      <label for="name">Full name</label>
      <input type="text" id="name" name="name">
      <label for="email">Email address</label>
      <input type="email" id="email" name="email">
      <label for="country">Country</label>
      <select id="country" name="country">
        <option value="us">United States</option>
      </select>
      <label for="password">Password</label>
      <input type="password" id="password" name="password" autocomplete="current-password">
      <button type="submit">Submit form</button>
    </form>
    <table>
      <caption>Data summary</caption>
      <thead><tr><th scope="col">Name</th><th scope="col">Value</th></tr></thead>
      <tbody><tr><td>Item</td><td>42</td></tr></tbody>
    </table>
    <video controls>
      <source src="video.mp4" type="video/mp4">
      <track kind="captions" src="captions.vtt" srclang="en" label="English">
    </video>
  </main>
  <footer></footer>
</body>
</html>`

// ─── Exemplary CSS ────────────────────────────────────────────────────────────
const GOOD_CSS = `
/* CSS reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --color-primary: #0066cc;
  --color-text: #333333;
  --color-bg: #ffffff;
  --spacing-md: 1rem;
  --font-size-base: 1rem;
}

body {
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-bg);
}

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }

.container { max-width: 75rem; margin: 0 auto; }

:focus-visible { outline: 2px solid var(--color-primary); }

@media (prefers-color-scheme: dark) {
  :root { --color-bg: #000; --color-text: #fff; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; }
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.fade { animation: fadeIn 0.3s ease; }

@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

@media print { body { font-size: 12pt; } }
`

// ─── Exemplary JavaScript ─────────────────────────────────────────────────────
const GOOD_JS = `
'use strict';

const API_URL = '/api/data';

async function fetchData() {
  try {
    const response = await fetch(API_URL);
    return response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

function getData() {
  return fetch(API_URL)
    .then(res => res.json())
    .catch(err => { console.error(err); throw err; });
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const id = setInterval(tick, 1000);
window.addEventListener('unload', () => clearInterval(id));

const controller = new AbortController();
const handleScroll = debounce(() => updateHeader(), 100);
window.addEventListener('scroll', handleScroll, { signal: controller.signal });

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function tick() {}
function updateHeader() {}
`

// ─── FALSE POSITIVE tests ─────────────────────────────────────────────────────

describe('False-positive audit — good HTML must not trigger rules', () => {
  // Run against the complete good HTML with all rule categories
  const htmlIssues = issuesIn(GOOD_HTML, [
    'html',
    'accessibility',
    'seo',
    'security',
    'performance',
    'images'
  ])

  it('reports which rules fire on exemplary HTML (should be empty)', () => {
    if (htmlIssues.length > 0) {
      console.log('\n  FALSE POSITIVES on good HTML:')
      htmlIssues.forEach(r => console.log(`    ✗ ${r}`))
    } else {
      console.log('\n  ✓ No false positives on good HTML')
    }
    // This assertion makes the test fail if there are any false positives
    expect(htmlIssues).toHaveLength(0)
  })
})

describe('False-positive audit — good CSS must not trigger rules', () => {
  const cssIssues = issuesIn(GOOD_CSS, ['css', 'performance'])

  it('reports which rules fire on exemplary CSS (should be empty)', () => {
    if (cssIssues.length > 0) {
      console.log('\n  FALSE POSITIVES on good CSS:')
      cssIssues.forEach(r => console.log(`    ✗ ${r}`))
    } else {
      console.log('\n  ✓ No false positives on good CSS')
    }
    expect(cssIssues).toHaveLength(0)
  })
})

describe('False-positive audit — good JavaScript must not trigger rules', () => {
  const jsIssues = issuesIn(GOOD_JS, ['javascript', 'security', 'performance'])

  it('reports which rules fire on exemplary JS (should be empty)', () => {
    if (jsIssues.length > 0) {
      console.log('\n  FALSE POSITIVES on good JS:')
      jsIssues.forEach(r => console.log(`    ✗ ${r}`))
    } else {
      console.log('\n  ✓ No false positives on good JS')
    }
    expect(jsIssues).toHaveLength(0)
  })
})
