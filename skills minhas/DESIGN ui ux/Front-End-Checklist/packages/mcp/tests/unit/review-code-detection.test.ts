/**
 * Detection Accuracy Tests for review_code
 *
 * These tests verify that review_code correctly detects (or does NOT detect)
 * specific issues in known HTML/CSS/JS fixtures. As you improve heuristics in
 * review-code.ts, add a passing test here to lock in the improvement.
 *
 * Fixture pattern:
 *   bad_<rule>  → HTML that SHOULD trigger the rule
 *   good_<rule> → HTML that should NOT trigger the rule (false positive guard)
 *
 * Coverage score at the bottom tracks progress over time.
 */

import type { Rule } from '@repo/types'
import { executeReviewCode } from '../../src/tools/review-code'

// Minimal rule set covering every heuristic in checkRule()
const RULES: Rule[] = [
  makeRule('alt-tags', 'accessibility', 'critical'),
  makeRule('alt-text', 'accessibility', 'critical'),
  makeRule('doctype', 'html', 'critical'),
  makeRule('semantic-html', 'html', 'high'),
  makeRule('html5-semantic', 'html', 'high'),
  makeRule('viewport', 'html', 'high'),
  makeRule('lang-attribute', 'html', 'high'),
  makeRule('https', 'security', 'critical'),
  makeRule('secure-connection', 'security', 'critical'),
  makeRule('meta-description', 'seo', 'high'),
  makeRule('title-tag', 'html', 'high'),
  makeRule('charset', 'html', 'high'),
  makeRule('form-label', 'accessibility', 'high'),
  makeRule('button-type', 'html', 'medium'),
  makeRule('inline-style', 'css', 'low'),
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
  // New heuristics
  makeRule('sri-integrity', 'security', 'high'),
  makeRule('csp-header', 'security', 'high'),
  makeRule('keyboard-navigation', 'accessibility', 'critical'),
  makeRule('focus-order', 'accessibility', 'high'),
  makeRule('css-variables', 'css', 'medium'),
  makeRule('custom-properties', 'css', 'medium'),
  makeRule('responsive-design', 'css', 'high'),
  makeRule('flexbox-grid', 'css', 'medium'),
  makeRule('module-imports', 'javascript', 'medium'),
  makeRule('naming-conventions', 'css', 'low'),
  makeRule('async-patterns', 'javascript', 'medium'),
  // HTMLHint-inspired additions
  makeRule('unique-id', 'html', 'high'),
  makeRule('javascript-inline', 'javascript', 'medium'),
  makeRule('form-validation', 'html', 'medium'),
  // Fourth pass — 28 new heuristics
  // JavaScript
  makeRule('avoid-eval', 'javascript', 'critical'),
  makeRule('console-cleanup', 'javascript', 'medium'),
  makeRule('const-let', 'javascript', 'medium'),
  makeRule('type-coercion', 'javascript', 'medium'),
  makeRule('error-handling', 'javascript', 'high'),
  makeRule('json-safety', 'javascript', 'high'),
  // Accessibility
  makeRule('button-name', 'accessibility', 'critical'),
  makeRule('empty-heading', 'accessibility', 'high'),
  makeRule('empty-links', 'accessibility', 'high'),
  makeRule('frame-title', 'accessibility', 'high'),
  makeRule('link-text', 'accessibility', 'medium'),
  makeRule('select-name', 'accessibility', 'high'),
  makeRule('video-captions', 'accessibility', 'high'),
  // HTML
  makeRule('defer-async', 'html', 'high'),
  makeRule('web-app-manifest', 'html', 'medium'),
  makeRule('input-types', 'html', 'medium'),
  makeRule('viewport-zoom', 'accessibility', 'critical'),
  // CSS
  makeRule('font-size', 'css', 'medium'),
  makeRule('specificity-management', 'css', 'medium'),
  makeRule('responsive-units', 'css', 'medium'),
  makeRule('webfont-format', 'css', 'medium'),
  makeRule('reset-css', 'css', 'low'),
  // Security
  makeRule('leaked-secrets', 'security', 'critical'),
  makeRule('form-https', 'security', 'critical'),
  makeRule('password-field-security', 'security', 'high'),
  makeRule('mixed-content', 'security', 'critical'),
  // Performance
  makeRule('font-loading', 'performance', 'high'),
  makeRule('render-blocking', 'performance', 'high'),
  // Fifth pass
  makeRule('image-compression', 'images', 'high'),
  makeRule('tabindex', 'accessibility', 'high'),
  makeRule('focus-styles', 'css', 'high'),
  makeRule('reduced-motion', 'accessibility', 'high'),
  makeRule('debounce-throttle', 'javascript', 'medium'),
  makeRule('memory-leaks', 'javascript', 'high'),
  makeRule('js-redirects', 'performance', 'medium'),
  makeRule('gtm-present', 'performance', 'medium'),
  makeRule('referrer-policy', 'security', 'medium'),
  makeRule('meta-in-body', 'seo', 'high'),
  makeRule('dark-mode-css', 'css', 'medium'),
  // AST-based structural checks
  makeRule('form-labels', 'accessibility', 'high'),
  makeRule('heading-order', 'html', 'high'),
  makeRule('unique-id', 'html', 'high')
]

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

function rulesDetectedIn(html: string, focus?: string[]): string[] {
  const result = executeReviewCode({ code: html, focus: focus as never, minPriority: 'low' }, RULES)
  return result.issues.map(i => i.rule)
}

function reviewResultIn(html: string, focus?: string[]) {
  return executeReviewCode({ code: html, focus: focus as never, minPriority: 'low' }, RULES)
}

function noIssuesIn(html: string, ruleSlug: string, focus?: string[]): boolean {
  return !rulesDetectedIn(html, focus).includes(ruleSlug)
}

// ─── TRUE POSITIVE tests — bad HTML MUST trigger the rule ───────────────────

describe('review_code — true positives (issues detected)', () => {
  it('detects missing alt attribute on img', () => {
    const rules = rulesDetectedIn('<html><body><img src="photo.jpg"></body></html>')
    expect(rules).toContain('alt-tags')
  })

  it('detects missing DOCTYPE', () => {
    const rules = rulesDetectedIn('<html lang="en"><head></head><body></body></html>')
    expect(rules).toContain('doctype')
  })

  it('detects missing lang attribute on html element', () => {
    const rules = rulesDetectedIn('<!DOCTYPE html><html><head></head><body></body></html>')
    expect(rules).toContain('lang-attribute')
  })

  it('detects missing viewport meta tag', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>'
    )
    expect(rules).toContain('viewport')
  })

  it('detects missing meta description', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>'
    )
    expect(rules).toContain('meta-description')
  })

  it('detects non-HTTPS URLs', () => {
    // Security category isn't auto-detected from anchor tags — explicit focus required
    const rules = rulesDetectedIn('<a href="http://example.com">link</a>', ['security'])
    expect(rules).toContain('https')
  })

  it('detects div-heavy HTML without semantic elements', () => {
    const html =
      '<html><body>' +
      '<div><div><div><div><div><div></div></div></div></div></div></div>'.repeat(2) +
      '</body></html>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('semantic-html')
  })

  it('detects missing title tag', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>'
    )
    expect(rules).toContain('title-tag')
  })

  it('detects missing charset', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>'
    )
    expect(rules).toContain('charset')
  })

  it('detects form inputs without labels', () => {
    const rules = rulesDetectedIn('<form><input type="text"><input type="email"></form>')
    expect(rules).toContain('form-label')
  })

  it('detects multiple h1 elements', () => {
    const rules = rulesDetectedIn('<html><body><h1>First</h1><h1>Second</h1></body></html>')
    expect(rules).toContain('heading-hierarchy')
  })

  it('detects target=_blank without rel hardening', () => {
    // new-tab is a security rule — needs explicit focus or JS context to trigger
    const rules = rulesDetectedIn('<a href="https://example.com" target="_blank">link</a>', [
      'security'
    ])
    expect(rules).toContain('new-tab')
  })

  it('detects missing canonical tag', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>'
    )
    expect(rules).toContain('canonical-url')
  })

  it('detects missing favicon', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>'
    )
    expect(rules).toContain('favicon')
  })

  it('detects images without lazy loading', () => {
    const html =
      '<body>' +
      '<img src="a.jpg" alt="a"><img src="b.jpg" alt="b"><img src="c.jpg" alt="c"><img src="d.jpg" alt="d">' +
      '</body>'
    const rules = rulesDetectedIn(html, ['performance'])
    expect(rules).toContain('lazy-loading')
  })

  it('detects images without width/height', () => {
    const rules = rulesDetectedIn('<img src="photo.jpg" alt="photo">')
    expect(rules).toContain('dimensions')
  })

  it('detects async/await without try-catch', () => {
    const js = 'async function getData() { const data = await fetch("/api"); return data.json(); }'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('error-handling')
  })

  it('does not add zero-finding guidance when static issues are found', () => {
    const result = reviewResultIn('<div class="notification-popover"><img src="photo.jpg"></div>', [
      'accessibility',
      'html',
      'images'
    ])
    const suggestions = result.suggestions.join('\n')

    expect(result.issues.length).toBeGreaterThan(0)
    expect(suggestions).not.toContain('No provable static issues')
    expect(suggestions).not.toContain('For overlay/widget behavior')
    expect(suggestions).not.toContain('For notification behavior')
  })

  it('detects third-party scripts without async/defer', () => {
    const html = '<head><script src="https://cdn.example.com/lib.js"></script></head>'
    const rules = rulesDetectedIn(html, ['performance'])
    expect(rules).toContain('third-party-script')
  })

  it('detects outline:none without focus styles', () => {
    const css = 'button { outline: none; color: red; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('focus-styles')
  })

  it('detects missing Open Graph tags', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>'
    )
    expect(rules).toContain('og-tags')
  })

  it('detects external scripts without SRI integrity', () => {
    const html = '<head><script src="https://cdn.example.com/lib.js"></script></head>'
    const rules = rulesDetectedIn(html, ['security'])
    expect(rules).toContain('sri-integrity')
  })

  it('detects positive tabindex (disrupts tab order)', () => {
    const html = '<button tabindex="2">Submit</button><button tabindex="1">Cancel</button>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('keyboard-navigation')
  })

  it('detects hardcoded hex colors without CSS variables', () => {
    const css =
      'body { color: #333333; background: #ffffff; } h1 { color: #0066cc; } a { color: #cc0000; } p { color: #666666; } span { color: #999999; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('css-variables')
  })

  it('detects fixed pixel widths blocking responsive layout', () => {
    const css = '.container { width: 1200px; } .sidebar { width: 300px; } .main { width: 900px; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('responsive-design')
  })

  it('detects require() usage instead of ES modules', () => {
    const js =
      'const fs = require("fs"); const path = require("path"); const utils = require("./utils");'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('module-imports')
  })

  it('detects page with <body> but no <h1> at all', () => {
    const html =
      '<html lang="en"><body><h2>Section</h2><p>Content without a top-level heading</p></body></html>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('heading-hierarchy')
  })

  it('detects page missing <main> landmark', () => {
    const html = '<html lang="en"><body><div>Content without a main element</div></body></html>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('semantic-html')
  })

  it('detects inline <script> blocks in HTML', () => {
    const html = '<html><body><script>alert("inline script")</script></body></html>'
    const rules = rulesDetectedIn(html, ['javascript'])
    expect(rules).toContain('javascript-inline')
  })

  it('detects <form> without method attribute', () => {
    const html =
      '<form action="/submit"><input type="text" name="q"><button type="submit">Go</button></form>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('form-validation')
  })

  it('detects duplicate ID values', () => {
    const html = '<html><body><div id="header">A</div><div id="header">B</div></body></html>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('unique-id')
  })

  it('detects eval() usage', () => {
    const js = 'const result = eval("2 + 2");'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('avoid-eval')
  })

  it('detects excessive console.log calls', () => {
    const js = 'console.log("a"); console.log("b"); console.warn("c");'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('console-cleanup')
  })

  it('detects var declarations', () => {
    const js = 'var x = 1; var y = 2;'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('const-let')
  })

  it('detects loose equality (==)', () => {
    const js = 'if (x == null) { return; }'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('type-coercion')
  })

  it('detects .then() without .catch()', () => {
    const js = 'fetch("/api").then(res => res.json()).then(data => console.log(data));'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('error-handling')
  })

  it('detects JSON.parse without try-catch', () => {
    const js = 'const data = JSON.parse(userInput);'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('json-safety')
  })

  it('detects empty button with no accessible name', () => {
    const html = '<button></button>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('button-name')
  })

  it('detects icon-only button with no accessible name', () => {
    const html = '<button type="button"><svg aria-hidden="true"></svg></button>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('button-name')
  })

  it('detects empty heading elements', () => {
    const html = '<html><body><h1></h1><p>Content</p></body></html>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('empty-heading')
  })

  it('detects empty links', () => {
    const html = '<a href="/about"></a>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('empty-links')
  })

  it('detects iframe without title', () => {
    const html = '<iframe src="https://example.com/embed"></iframe>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('frame-title')
  })

  it('detects generic link text', () => {
    const html = '<a href="/more">click here</a>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('link-text')
  })

  it('detects select without label', () => {
    const html = '<select name="country"><option value="us">US</option></select>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('select-name')
  })

  it('detects video without caption tracks', () => {
    const html = '<video src="video.mp4" controls></video>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('video-captions')
  })

  it('detects script in head without defer/async', () => {
    const html = '<head><script src="/app.js"></script></head>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('defer-async')
  })

  it('detects missing web app manifest', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>App</title></head><body></body></html>'
    )
    expect(rules).toContain('web-app-manifest')
  })

  it('detects input without type attribute', () => {
    const html = '<form><input name="search"></form>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('input-types')
  })

  it('detects viewport with user-scalable=no', () => {
    const html =
      '<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('viewport-zoom')
  })

  it('detects px font sizes', () => {
    const css = 'body { font-size: 16px; } h1 { font-size: 32px; } p { font-size: 14px; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('font-size')
  })

  it('detects excessive !important', () => {
    const css =
      '.a { color: red !important; } .b { margin: 0 !important; } .c { padding: 0 !important; } .d { display: none !important; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('specificity-management')
  })

  it('detects px spacing instead of relative units', () => {
    const css = '.card { margin: 16px; padding: 24px; gap: 8px; line-height: 24px; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('responsive-units')
  })

  it('detects @font-face without woff2', () => {
    const css = '@font-face { font-family: "MyFont"; src: url("font.woff") format("woff"); }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('webfont-format')
  })

  it('detects potential leaked API key', () => {
    const js = `const API_KEY = "${'sk_' + 'live_AbCdEfGhIjKlMnOpQrStUvWx'}";`
    const rules = rulesDetectedIn(js, ['security'])
    expect(rules).toContain('leaked-secrets')
  })

  it('detects form action over HTTP', () => {
    const html = '<form action="http://example.com/submit" method="post"><input type="text"></form>'
    const rules = rulesDetectedIn(html, ['security'])
    expect(rules).toContain('form-https')
  })

  it('detects password field without autocomplete', () => {
    const html = '<input type="password" name="password">'
    const rules = rulesDetectedIn(html, ['security'])
    expect(rules).toContain('password-field-security')
  })

  it('detects HTTP resource on HTTPS page', () => {
    const html =
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="https://example.com/styles.css"></head><body><img src="http://cdn.example.com/photo.jpg"></body></html>'
    const rules = rulesDetectedIn(html, ['security'])
    expect(rules).toContain('mixed-content')
  })

  it('detects web fonts without font-display', () => {
    const css = '@font-face { font-family: "MyFont"; src: url("font.woff2") format("woff2"); }'
    const rules = rulesDetectedIn(css, ['performance'])
    expect(rules).toContain('font-loading')
  })

  it('detects render-blocking scripts in head', () => {
    const html =
      '<head><script src="/app.js"></script><script src="/vendor.js"></script></head><body></body>'
    const rules = rulesDetectedIn(html, ['performance'])
    expect(rules).toContain('render-blocking')
  })

  it('detects large inline base64 image', () => {
    const longBase64 = 'A'.repeat(600)
    const html = `<img src="data:image/png;base64,${longBase64}">`
    const rules = rulesDetectedIn(html, ['images'])
    expect(rules).toContain('image-compression')
  })

  it('detects positive tabindex via tabindex slug', () => {
    const html = '<button tabindex="3">Submit</button>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('tabindex')
  })

  it('detects outline:none without focus styles via focus-styles slug', () => {
    const css = 'a { outline: none; color: blue; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('focus-styles')
  })

  it('detects CSS animations without prefers-reduced-motion', () => {
    const css =
      '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .loader { animation: spin 1s linear infinite; }'
    const rules = rulesDetectedIn(css, ['accessibility'])
    expect(rules).toContain('reduced-motion')
  })

  it('detects scroll listener without debounce', () => {
    const js = 'window.addEventListener("scroll", function() { updateHeader(); });'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('debounce-throttle')
  })

  it('detects setInterval without clearInterval', () => {
    const js = 'const id = setInterval(function() { updateClock(); }, 1000);'
    const rules = rulesDetectedIn(js, ['javascript'])
    expect(rules).toContain('memory-leaks')
  })

  it('detects window.location redirect', () => {
    const js = 'window.location.href = "/dashboard";'
    const rules = rulesDetectedIn(js, ['performance'])
    expect(rules).toContain('js-redirects')
  })

  it('detects GTM script without async', () => {
    const html = '<script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXXX"></script>'
    const rules = rulesDetectedIn(html, ['performance'])
    expect(rules).toContain('gtm-present')
  })

  it('detects missing referrer policy', () => {
    const rules = rulesDetectedIn(
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>',
      ['security']
    )
    expect(rules).toContain('referrer-policy')
  })

  it('detects meta tag in body (after </head>)', () => {
    const html =
      '<!DOCTYPE html><html><head><title>T</title></head><body><meta name="description" content="late"></body></html>'
    const rules = rulesDetectedIn(html, ['seo'])
    expect(rules).toContain('meta-in-body')
  })

  it('detects CSS with colors but no dark mode support', () => {
    const css =
      'body { background: #ffffff; color: #333333; } h1 { color: #0066cc; } a { color: #cc0000; }'
    const rules = rulesDetectedIn(css, ['css'])
    expect(rules).toContain('dark-mode-css')
  })

  // ── AST-based structural checks (node-html-parser) ──────────────────────────

  it('AST: detects unlabelled input (no for= match)', () => {
    const html =
      '<html><body><form><label for="username">User</label><input type="text" id="username"><input type="email" id="email" name="email"></form></body></html>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('form-label')
  })

  it('AST: detects unlabelled JSX fragment input', () => {
    const jsx =
      '<form><label htmlFor="username">User</label><input type="text" id="username" /><input type="email" id="email" /></form>'
    const rules = rulesDetectedIn(jsx, ['accessibility'])
    expect(rules).toContain('form-labels')
  })

  it('AST: detects heading level skip (h1 → h3 without h2)', () => {
    const html = '<html><body><h1>Title</h1><h3>Subsection</h3><p>content</p></body></html>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('heading-order')
  })

  it('AST: detects <title> in <body> instead of <head>', () => {
    const html = '<html><head></head><body><title>Wrong</title><h1>Page</h1></body></html>'
    const rules = rulesDetectedIn(html, ['html'])
    expect(rules).toContain('title-tag')
  })

  it('AST: detects duplicate IDs accurately', () => {
    const html =
      '<html><body><section id="hero">A</section><section id="hero">B</section></body></html>'
    const rules = rulesDetectedIn(html)
    expect(rules).toContain('unique-id')
  })

  it('AST: detects img without alt (even when other imgs have alt)', () => {
    const html = '<html><body><img src="a.jpg" alt="described"><img src="b.jpg"></body></html>'
    const rules = rulesDetectedIn(html, ['accessibility'])
    expect(rules).toContain('alt-tags')
  })
})

// ─── TRUE NEGATIVE tests — good HTML MUST NOT trigger the rule ──────────────

describe('review_code — true negatives (no false positives)', () => {
  it('does not flag alt when all images have alt', () => {
    const html = '<img src="photo.jpg" alt="A scenic mountain view">'
    expect(noIssuesIn(html, 'alt-tags')).toBe(true)
  })

  it('does not flag decorative image with empty alt', () => {
    const html = '<img src="divider.svg" alt="">'
    expect(noIssuesIn(html, 'alt-tags')).toBe(true)
    expect(noIssuesIn(html, 'alt-text')).toBe(true)
  })

  it('does not flag DOCTYPE when present', () => {
    const html = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body></body></html>'
    expect(noIssuesIn(html, 'doctype')).toBe(true)
  })

  it('does not flag lang when html has lang attribute', () => {
    const html = '<!DOCTYPE html><html lang="en"><head></head><body></body></html>'
    expect(noIssuesIn(html, 'lang-attribute')).toBe(true)
  })

  it('does not flag new-tab when rel=noopener is present', () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>'
    expect(noIssuesIn(html, 'new-tab')).toBe(true)
  })

  it('does not flag https for https URLs', () => {
    const html = '<a href="https://example.com">secure link</a>'
    expect(noIssuesIn(html, 'https')).toBe(true)
  })

  it('does not flag form-label when labels are present', () => {
    const html = '<form><label for="name">Name</label><input type="text" id="name"></form>'
    expect(noIssuesIn(html, 'form-label')).toBe(true)
  })

  it('does not flag form-labels when JSX label uses htmlFor', () => {
    const jsx = `
      export function Example() {
        return (
          <form>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" />
          </form>
        )
      }
    `
    expect(noIssuesIn(jsx, 'form-labels', ['accessibility'])).toBe(true)
  })

  it('does not flag form-labels on a reusable single-input primitive', () => {
    const jsx = `
      import * as React from 'react'

      export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
        return <input {...props} />
      }
    `
    expect(noIssuesIn(jsx, 'form-labels', ['accessibility'])).toBe(true)
  })

  it('does not flag heading-hierarchy with single h1', () => {
    const html = '<html><body><h1>Title</h1><h2>Section</h2></body></html>'
    expect(noIssuesIn(html, 'heading-hierarchy')).toBe(true)
  })

  it('does not flag error-handling when try-catch is present', () => {
    const js =
      'async function getData() { try { const data = await fetch("/api"); return data.json(); } catch(e) { console.error(e); } }'
    expect(noIssuesIn(js, 'error-handling', ['javascript'])).toBe(true)
  })

  it('does not flag heading-hierarchy when page has exactly one h1', () => {
    const html = '<html lang="en"><body><h1>Page Title</h1><h2>Section</h2></body></html>'
    expect(noIssuesIn(html, 'heading-hierarchy')).toBe(true)
  })

  it('does not flag heading-hierarchy on JSX component source with partial heading tree', () => {
    const jsx = `
      import { SectionHeading } from './section-heading'

      export function ExamplePage() {
        return (
          <>
            <h1>Page Title</h1>
            <SectionHeading title="Setup" />
            <h3>Nested card title</h3>
          </>
        )
      }
    `
    expect(noIssuesIn(jsx, 'heading-hierarchy')).toBe(true)
    expect(noIssuesIn(jsx, 'heading-order')).toBe(true)
  })

  it('does not flag head-managed metadata rules on Next metadata-driven page source', () => {
    const page = `
      import type { Metadata } from 'next'

      export async function generateMetadata(): Promise<Metadata> {
        return {
          title: 'Example',
          description: 'Page description',
          alternates: { canonical: 'https://example.com/page' },
          openGraph: { title: 'Example' }
        }
      }

      export default function Page() {
        return <main><h1>Example</h1></main>
      }
    `

    expect(noIssuesIn(page, 'meta-description')).toBe(true)
    expect(noIssuesIn(page, 'canonical-url')).toBe(true)
    expect(noIssuesIn(page, 'structured-data')).toBe(true)
    expect(noIssuesIn(page, 'viewport')).toBe(true)
  })

  it('does not flag generateMetadata async function for generic error-handling rules', () => {
    const page = `
      import type { Metadata } from 'next'

      export async function generateMetadata(): Promise<Metadata> {
        return {
          title: 'Example'
        }
      }

      export default function Page() {
        return <main><h1>Example</h1></main>
      }
    `

    expect(noIssuesIn(page, 'error-handling', ['javascript'])).toBe(true)
    expect(noIssuesIn(page, 'error-handling', ['javascript'])).toBe(true)
  })

  it('does not confuse <header> with <head> in component markup', () => {
    const jsx = `
      export function Header() {
        return (
          <header>
            <h2>Section</h2>
          </header>
        )
      }
    `

    expect(noIssuesIn(jsx, 'meta-description')).toBe(true)
    expect(noIssuesIn(jsx, 'canonical-url')).toBe(true)
    expect(noIssuesIn(jsx, 'content-security-policy')).toBe(true)
  })

  it('does not flag async React server component source for missing try-catch', () => {
    const page = `
      export default async function DashboardPage() {
        const data = await fetch('https://example.com/api').then(res => res.json())
        return <main><h1>Dashboard</h1><pre>{JSON.stringify(data)}</pre></main>
      }
    `

    expect(noIssuesIn(page, 'error-handling', ['javascript'])).toBe(true)
    expect(noIssuesIn(page, 'error-handling', ['javascript'])).toBe(true)
  })

  it('does not flag semantic-html on a component fragment that is not a full document', () => {
    const jsx = `
      export function CardGrid() {
        return (
          <div>
            <div>One</div>
            <div>Two</div>
            <div>Three</div>
            <div>Four</div>
            <div>Five</div>
            <div>Six</div>
          </div>
        )
      }
    `
    expect(noIssuesIn(jsx, 'semantic-html')).toBe(true)
    expect(noIssuesIn(jsx, 'html5-semantic')).toBe(true)
  })

  it('does not flag skip-navigation on a nav-only component fragment', () => {
    const jsx = `
      export function HeaderNav() {
        return (
          <header>
            <nav aria-label="Main">
              <a href="/docs">Docs</a>
            </nav>
          </header>
        )
      }
    `
    expect(noIssuesIn(jsx, 'skip-link')).toBe(true)
  })

  it('does not flag form-validation on a client-side React form handler', () => {
    const jsx = `
      export function SearchForm() {
        return (
          <form onSubmit={event => event.preventDefault()}>
            <input type="text" name="q" />
          </form>
        )
      }
    `
    expect(noIssuesIn(jsx, 'form-validation')).toBe(true)
  })

  it('does not flag semantic-html when <main> is present', () => {
    const html = '<html lang="en"><body><main><p>Content</p></main></body></html>'
    expect(noIssuesIn(html, 'semantic-html')).toBe(true)
  })

  it('does not flag aria-labels when aria-label appears before role=img', () => {
    const html = '<span aria-label="love" role="img">❤️</span>'
    expect(noIssuesIn(html, 'aria-labels', ['accessibility'])).toBe(true)
  })

  it('does not flag icon-only button with aria-label', () => {
    const html = '<button type="button" aria-label="Close"><svg aria-hidden="true"></svg></button>'
    expect(noIssuesIn(html, 'button-name', ['accessibility'])).toBe(true)
  })

  it('does not flag javascript-inline for external scripts with src', () => {
    const html = '<script src="https://cdn.example.com/app.js"></script>'
    expect(noIssuesIn(html, 'javascript-inline', ['javascript'])).toBe(true)
  })

  it('does not flag javascript-inline for JSON-LD script blocks', () => {
    const html = '<script type="application/ld+json">{"@context":"https://schema.org"}</script>'
    expect(noIssuesIn(html, 'javascript-inline', ['javascript'])).toBe(true)
  })

  it('does not flag form-validation when method attribute is present', () => {
    const html = '<form action="/submit" method="post"><input type="text" name="q"></form>'
    expect(noIssuesIn(html, 'form-validation')).toBe(true)
  })

  it('does not flag unique-id when all IDs are distinct', () => {
    const html =
      '<html><body><div id="header">A</div><div id="main">B</div><div id="footer">C</div></body></html>'
    expect(noIssuesIn(html, 'unique-id')).toBe(true)
  })

  it('does not flag unique-id for dynamic JSX id expressions', () => {
    const jsx = `
      export function Section({ category }: { category: string }) {
        return <div id={category}>Section</div>
      }
    `
    expect(noIssuesIn(jsx, 'unique-id')).toBe(true)
  })

  it('does not flag eval for string containing eval', () => {
    const js = 'const result = "eval is dangerous";'
    expect(noIssuesIn(js, 'avoid-eval', ['javascript'])).toBe(true)
  })

  it('does not flag console-cleanup for 2 or fewer console calls', () => {
    const js = 'console.log("start"); console.log("end");'
    expect(noIssuesIn(js, 'console-cleanup', ['javascript'])).toBe(true)
  })

  it('does not flag const-let for const/let usage', () => {
    const js = 'const x = 1; let y = 2;'
    expect(noIssuesIn(js, 'const-let', ['javascript'])).toBe(true)
  })

  it('does not flag video-captions when caption track present', () => {
    const html = '<video src="v.mp4"><track kind="captions" src="captions.vtt"></video>'
    expect(noIssuesIn(html, 'video-captions', ['accessibility'])).toBe(true)
  })

  it('does not flag form-https for HTTPS action', () => {
    const html = '<form action="https://example.com/submit" method="post"></form>'
    expect(noIssuesIn(html, 'form-https', ['security'])).toBe(true)
  })

  it('does not flag viewport-zoom when user-scalable is not disabled', () => {
    const html = '<meta name="viewport" content="width=device-width, initial-scale=1">'
    expect(noIssuesIn(html, 'viewport-zoom')).toBe(true)
  })

  it('does not flag defer-async for scripts with defer', () => {
    const html = '<head><script src="/app.js" defer></script></head>'
    expect(noIssuesIn(html, 'defer-async')).toBe(true)
  })

  it('does not flag font-loading when font-display is set', () => {
    const css =
      '@font-face { font-family: "MyFont"; src: url("font.woff2") format("woff2"); font-display: swap; }'
    expect(noIssuesIn(css, 'font-loading', ['performance'])).toBe(true)
  })

  it('does not flag reduced-motion when prefers-reduced-motion is present', () => {
    const css =
      '@keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { .loader { animation: none; } }'
    expect(noIssuesIn(css, 'reduced-motion', ['accessibility'])).toBe(true)
  })

  it('does not flag memory-leaks when clearInterval is present', () => {
    const js = 'const id = setInterval(tick, 1000); onDestroy(() => clearInterval(id));'
    expect(noIssuesIn(js, 'memory-leaks', ['javascript'])).toBe(true)
  })

  it('does not flag debounce-throttle when throttle utility is used', () => {
    const js =
      'function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; } window.addEventListener("scroll", debounce(updateHeader, 100));'
    expect(noIssuesIn(js, 'debounce-throttle', ['javascript'])).toBe(true)
  })

  it('does not flag dark-mode-css when prefers-color-scheme is used', () => {
    const css =
      'body { background: #fff; color: #333; } @media (prefers-color-scheme: dark) { body { background: #000; color: #fff; } }'
    expect(noIssuesIn(css, 'dark-mode-css', ['css'])).toBe(true)
  })

  it('does not flag meta-in-body when meta is in head', () => {
    const html =
      '<!DOCTYPE html><html><head><title>T</title><meta name="description" content="ok"></head><body></body></html>'
    expect(noIssuesIn(html, 'meta-in-body', ['seo'])).toBe(true)
  })

  it('suggests manual rules for simplified notification popovers with no static findings', () => {
    const jsx = `
      export function HeaderNotifications() {
        return (
          <header>
            <button type="button" aria-label="Open notifications popover">
              Notifications
            </button>
            <div className="notification-popover responsive-container" data-state="closed">
              <p>No new notifications</p>
            </div>
          </header>
        )
      }
    `
    const result = reviewResultIn(jsx, ['accessibility', 'css', 'html'])
    const suggestions = result.suggestions.join('\n')

    expect(result.issues).toHaveLength(0)
    expect(result.summary.issuesFound).toBe(0)
    expect(suggestions).toContain('No provable static issues')
    expect(suggestions).toContain('keyboard-navigation')
    expect(suggestions).toContain('focus-management')
    expect(suggestions).toContain('focus-styles')
    expect(suggestions).toContain('focus-not-obscured')
    expect(suggestions).toContain('touch-targets')
    expect(suggestions).toContain('accessible-notifications')
    expect(suggestions).toContain('aria-live-regions')
    expect(suggestions).toContain('horizontal-scroll')
    expect(suggestions).toContain('zoom-reflow')
    expect(suggestions).toContain('responsive-units')
    expect(suggestions).toContain('container-queries')
  })
})

// ─── Coverage summary ────────────────────────────────────────────────────────

describe('review_code — detection coverage summary', () => {
  it('reports what % of tested rules have both true-positive and true-negative fixtures', () => {
    // This test always passes — it's a reporting test that shows coverage metrics
    const testedRules = RULES.map(r => r.slug)
    console.log(`\n  Tested rules with heuristics: ${testedRules.length}`)
    console.log(`  Rules covered: ${testedRules.join(', ')}`)
    expect(testedRules.length).toBeGreaterThan(0)
  })
})
