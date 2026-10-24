import { executeGetRule } from '../../src/tools/get-rule'

describe('executeGetRule', () => {
  it('includes compact source metadata in the MCP response', () => {
    const result = executeGetRule({ slug: 'doctype', includeUrl: true }, [
      {
        title: 'Use HTML5 Doctype',
        slug: 'doctype',
        categories: ['html'],
        priority: 'critical',
        content: '# Doctype\n\nUse <!DOCTYPE html>.',
        primaryCategory: 'html',
        url: '/en/rules/html/doctype',
        prompts: {
          check: 'Check for doctype.',
          fix: 'Add doctype.',
          explain: 'It enables standards mode.'
        },
        sources: [
          {
            id: 'html-spec',
            title: 'WHATWG HTML',
            url: 'https://html.spec.whatwg.org/',
            type: 'spec',
            role: 'standard',
            authority: 'primary'
          },
          {
            id: 'mdn-html',
            title: 'MDN HTML',
            url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
            type: 'mdn',
            role: 'reference',
            authority: 'primary'
          }
        ],
        sourceSummary: {
          sourceCount: 2,
          primarySourceCount: 2,
          sourceRoleCount: 2
        }
      }
    ])

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error('Expected successful rule lookup')
    }

    expect(result.rule.sources).toHaveLength(2)
    expect(result.rule.sourceSummary).toMatchObject({
      sourceCount: 2,
      primarySourceCount: 2,
      sourceRoleCount: 2
    })
  })
})
