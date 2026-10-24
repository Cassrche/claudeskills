import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFullCatalogMarkdown,
  buildReadmeCatalogMarkdown,
  replaceRulesCatalog
} from '../generate-readme'

const sampleRules = [
  {
    category: 'seo',
    title: 'Add canonical URLs',
    description: 'Point duplicate pages to the preferred URL.',
    priority: 'high',
    slug: 'canonical-url'
  },
  {
    category: 'html',
    title: 'Declare the doctype',
    description: 'Use the HTML5 doctype at the top of every document.',
    priority: 'critical',
    slug: 'doctype'
  },
  {
    category: 'seo',
    title: 'Write unique titles',
    description: 'Keep page titles unique and descriptive.',
    priority: 'medium',
    slug: 'title-unique'
  }
] satisfies Parameters<typeof buildReadmeCatalogMarkdown>[0]

test('buildReadmeCatalogMarkdown renders quick links and grouped checklist entries', () => {
  const markdown = buildReadmeCatalogMarkdown(sampleRules)

  assert.match(
    markdown,
    /<!-- Generated from 3 English rules\. This block is maintained by `pnpm generate:readme`\./
  )
  assert.match(markdown, /### Jump to a category/)
  assert.match(
    markdown,
    /- \[HTML\]\(#html\) \(1\) · \[Open on the site\]\(https:\/\/frontendchecklist\.io\/rules\/html\)/
  )
  assert.match(markdown, /### Categories/)
  assert.match(markdown, /### HTML/)
  assert.match(
    markdown,
    /\*1 rules\. Semantic markup, metadata, forms, and document structure rules\.\*/
  )
  assert.match(
    markdown,
    /\[Browse HTML on frontendchecklist\.io\]\(https:\/\/frontendchecklist\.io\/rules\/html\)/
  )
  assert.match(
    markdown,
    /- \[ \] \[Declare the doctype\]\(https:\/\/frontendchecklist\.io\/rules\/html\/doctype\) !\[Critical\]\[critical_img\]: Use the HTML5 doctype at the top of every document\./
  )
  assert.match(markdown, /\*\*\[Back to top\]\(#front-end-checklist\)\*\*/)
  assert.match(markdown, /\[critical_img\]: \.\/apps\/web\/public\/priority\/critical\.svg/)
  assert.match(markdown, /\[high_img\]: \.\/apps\/web\/public\/priority\/high\.svg/)
})

test('buildFullCatalogMarkdown renders grouped checkbox entries and quick links', () => {
  const markdown = buildFullCatalogMarkdown(sampleRules)

  assert.match(markdown, /# Front-End Checklist Rules Catalog/)
  assert.match(markdown, /Generated from 3 English rules across 2 categories\./)
  assert.match(markdown, /## Quick links/)
  assert.match(markdown, /- \[HTML\]\(#html\) \(1\)/)
  assert.match(markdown, /- \[SEO\]\(#seo\) \(2\)/)
  assert.match(markdown, /### HTML/)
  assert.match(
    markdown,
    /\[Browse HTML on frontendchecklist\.io\]\(https:\/\/frontendchecklist\.io\/rules\/html\)/
  )
  assert.match(
    markdown,
    /- \[ \] \[Declare the doctype\]\(https:\/\/frontendchecklist\.io\/rules\/html\/doctype\) !\[Critical\]\[critical_img\]: Use the HTML5 doctype at the top of every document\./
  )
  assert.match(
    markdown,
    /- \[ \] \[Add canonical URLs\]\(https:\/\/frontendchecklist\.io\/rules\/seo\/canonical-url\) !\[High\]\[high_img\]: Point duplicate pages to the preferred URL\./
  )
  assert.ok(
    markdown.indexOf('### HTML') < markdown.indexOf('### SEO'),
    'categories should follow canonical-url order'
  )
  assert.match(markdown, /\*\*\[Back to top\]\(#front-end-checklist-rules-catalog\)\*\*/)
  assert.match(markdown, /\[critical_img\]: \.\.\/\.\.\/apps\/web\/public\/priority\/critical\.svg/)
  assert.match(markdown, /\[low_img\]: \.\.\/\.\.\/apps\/web\/public\/priority\/low\.svg/)
})

test('replaceRulesCatalog rewrites only the marked block', () => {
  const readme = [
    '# Sample',
    '',
    '<!-- rules-catalog:start -->',
    'old block',
    '<!-- rules-catalog:end -->',
    '',
    'footer'
  ].join('\n')

  const result = replaceRulesCatalog(readme, 'new block')

  assert.equal(
    result,
    [
      '# Sample',
      '',
      '<!-- rules-catalog:start -->',
      'new block',
      '<!-- rules-catalog:end -->',
      '',
      'footer'
    ].join('\n')
  )
})

test('replaceRulesCatalog fails when markers are duplicated', () => {
  assert.throws(
    () =>
      replaceRulesCatalog(
        [
          '<!-- rules-catalog:start -->',
          '<!-- rules-catalog:start -->',
          '<!-- rules-catalog:end -->'
        ].join('\n'),
        'content'
      ),
    /exactly one rules catalog start marker/
  )
})
