import assert from 'node:assert/strict'
import * as path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadRules } from '../load-rules'

const fixtureRulesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/rules/en'
)

test('loadRules parses normalized rule records from MDX files', () => {
  const rules = loadRules(fixtureRulesDir)

  assert.deepEqual(rules, [
    {
      title: 'Use the language attribute',
      slug: 'language-attribute',
      categories: ['html'],
      subcategory: 'meta',
      priority: 'high',
      prompts: {
        check: 'Check for a lang attribute on the html element.',
        fix: 'Add the correct lang attribute to the html element.',
        explain: 'Explain why the lang attribute matters.'
      },
      content: '# Rule body',
      primaryCategory: 'html',
      url: '/rules/html/language-attribute'
    },
    {
      title: 'Use block categories',
      slug: 'multi-category-rule',
      categories: ['html', 'accessibility'],
      priority: 'medium',
      content: '# Multi category body',
      primaryCategory: 'html',
      url: '/rules/html/multi-category-rule'
    }
  ])
})
