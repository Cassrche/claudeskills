import type { CuratedChecklist, Rule } from '@repo/types'
import {
  getTelemetryStats,
  handleMcpHttpRequest,
  MCP_PROMPTS,
  MCP_PROTOCOL_VERSION,
  MCP_RESOURCE_TEMPLATES,
  MCP_SERVER_INSTRUCTIONS,
  resetTelemetry
} from '../../src/server'

const mockRules: Rule[] = [
  {
    title: 'Use HTML5 Doctype',
    slug: 'doctype',
    categories: ['html'],
    priority: 'critical',
    content:
      '# Doctype\n\nThe HTML5 doctype must be declared at the very top of every HTML page.\n\n```html\n<!DOCTYPE html>\n```',
    primaryCategory: 'html',
    url: '/en/rules/html/doctype',
    prompts: {
      check: 'Verify this HTML document has <!DOCTYPE html> at the top.',
      fix: 'Add <!DOCTYPE html> as the first line of the HTML document.',
      explain: 'Explain why HTML5 doctype is required for standards mode rendering.'
    }
  },
  {
    title: 'Add Alternative Text to Images',
    slug: 'alt-tags',
    categories: ['accessibility', 'html'],
    priority: 'critical',
    content: '# Alt Text\n\nAll images must have appropriate alternative text.',
    primaryCategory: 'accessibility',
    url: '/en/rules/accessibility/alt-tags',
    prompts: {
      check: 'Check that all images have appropriate alt text.',
      fix: 'Add descriptive alt text to all images.',
      explain: 'Explain why alt text is essential for accessibility.'
    }
  }
]

const mockChecklists: CuratedChecklist[] = [
  {
    id: 'launch-checklist',
    slug: 'launch-checklist',
    title: 'Launch Checklist',
    description: 'Essential checks before deploying to production.',
    icon: 'rocket',
    rules: ['html/doctype', 'accessibility/alt-tags'],
    estimatedTime: '45 minutes',
    difficulty: 'beginner',
    order: 1,
    featured: true,
    language: 'en',
    url: '/en/checklists/launch-checklist'
  }
]

async function callMcp(
  body: Record<string, unknown>,
  checklists: CuratedChecklist[] = mockChecklists
) {
  const request = new Request('https://example.com/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const response = await handleMcpHttpRequest(
    request,
    () => mockRules,
    () => checklists,
    {},
    body
  )

  return {
    status: response.status,
    json: (await response.json()) as Record<string, unknown>
  }
}

function buildInitializeRequest(id: number) {
  return {
    jsonrpc: '2.0' as const,
    id,
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'jest-client',
        version: '1.0.0'
      }
    }
  }
}

describe('SDK-backed MCP server', () => {
  beforeEach(() => {
    resetTelemetry()
  })

  it('returns initialize metadata through the SDK transport', async () => {
    const { status, json } = await callMcp(buildInitializeRequest(1))

    expect(status).toBe(200)
    expect(json).toMatchObject({
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: {
          name: 'frontend-checklist-mcp',
          version: '1.0.0'
        },
        instructions: MCP_SERVER_INSTRUCTIONS,
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        }
      }
    })
  })

  it('lists tools with checklist-backed entries only when checklist data exists', async () => {
    const withChecklists = await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    })

    const withChecklistTools = (
      withChecklists.json.result as {
        tools: Array<{ name: string; title?: string; description?: string }>
      }
    ).tools

    expect(withChecklistTools.map(tool => tool.name)).toContain('get_workflow')
    expect(withChecklistTools.map(tool => tool.name)).toContain('get_checklist_rules')
    expect(withChecklistTools.find(tool => tool.name === 'review_code')).toMatchObject({
      title: 'Review Frontend Code',
      description: expect.stringContaining('non-exhaustive static heuristic review')
    })

    const withoutChecklists = await callMcp(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      },
      []
    )

    const withoutChecklistTools = (
      withoutChecklists.json.result as { tools: Array<{ name: string }> }
    ).tools.map(tool => tool.name)

    expect(withoutChecklistTools).not.toContain('get_workflow')
    expect(withoutChecklistTools).not.toContain('get_checklist_rules')
  })

  it('returns structured tool results through tools/call', async () => {
    const { json } = await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_rule',
        arguments: {
          slug: 'doctype'
        }
      }
    })

    expect(json).toMatchObject({
      result: {
        structuredContent: {
          slug: 'doctype',
          title: 'Use HTML5 Doctype'
        },
        content: [
          {
            type: 'text'
          }
        ]
      }
    })
  })

  it('lists prompts and returns a workflow prompt', async () => {
    const promptsList = await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/list'
    })

    const prompts = (promptsList.json.result as { prompts: Array<{ name: string }> }).prompts.map(
      prompt => prompt.name
    )

    expect(prompts).toEqual(expect.arrayContaining([...MCP_PROMPTS]))

    const promptResult = await callMcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'prompts/get',
      params: {
        name: 'workflow_prompt',
        arguments: {
          checklist: 'launch-checklist'
        }
      }
    })

    expect(promptResult.json).toMatchObject({
      result: {
        messages: [
          {
            role: 'user'
          }
        ]
      }
    })
  })

  it('lists resources, resource templates, and reads a rule resource', async () => {
    const resourcesList = await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'resources/list'
    })

    expect(resourcesList.json).toMatchObject({
      result: {
        resources: expect.arrayContaining([
          expect.objectContaining({
            uri: 'frontendchecklist://rules/doctype'
          })
        ])
      }
    })

    const templatesList = await callMcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/templates/list'
    })

    expect(templatesList.json).toMatchObject({
      result: {
        resourceTemplates: expect.arrayContaining([
          expect.objectContaining({ uriTemplate: MCP_RESOURCE_TEMPLATES.rule }),
          expect.objectContaining({ uriTemplate: MCP_RESOURCE_TEMPLATES.checklist })
        ])
      }
    })

    const resourceRead = await callMcp({
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/read',
      params: {
        uri: 'frontendchecklist://rules/doctype'
      }
    })

    expect(resourceRead.json).toMatchObject({
      result: {
        contents: [
          expect.objectContaining({
            uri: 'frontendchecklist://rules/doctype'
          })
        ]
      }
    })
  })

  it('records anonymous tool telemetry through SDK tool execution', async () => {
    await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_rules',
        arguments: {
          query: 'doctype'
        }
      }
    })

    expect(getTelemetryStats()).toMatchObject({
      search_rules: 1
    })
  })
})
