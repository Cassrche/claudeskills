import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { CuratedChecklist, Rule } from '@repo/types'
import { registerPrompts } from './server-prompts'
import { registerResources } from './server-resources'
import { registerTools } from './server-tools'
import { DEFAULT_MAX_RESPONSE_CHARS } from './utils/response-cap'

export const MCP_PROTOCOL_VERSION = '2025-06-18'
export const MCP_SERVER_INFO = {
  name: 'frontend-checklist-mcp',
  version: '1.0.0'
} as const

export const MCP_SERVER_INSTRUCTIONS = [
  'Use Front-End Checklist whenever the user is reviewing, implementing, debugging, or auditing frontend code.',
  'Reach for this server for HTML, CSS, JavaScript, TypeScript, React, Next.js, accessibility, performance, SEO, security, images, privacy, i18n, testing, and launch-readiness work.',
  'For pasted or inspected frontend code, call review_code first as a conservative static heuristic pass, then use its suggestions plus search_rules, get_rule, fix_rule, explain_rule, or check_rule for deeper remediation.',
  'If review_code returns no issues, treat that as no provable static issue found; follow suggestions or retrieve relevant rules before concluding the implementation is clean.',
  'For broad audits, call get_workflow or get_checklist_rules before checking individual rules. For live public pages, use audit_url.'
].join(' ')

export const MCP_RESOURCE_TEMPLATES = {
  rule: 'frontendchecklist://rules/{slug}',
  checklist: 'frontendchecklist://checklists/{slug}'
} as const

export const MCP_PROMPTS = [
  'review_code_prompt',
  'explain_rule_prompt',
  'fix_rule_prompt',
  'audit_url_prompt',
  'workflow_prompt'
] as const

interface McpServerOptions {
  maxResponseChars?: number
  telemetryEnabled?: boolean
}

/**
 * Telemetry storage (in-memory, anonymous)
 */
const telemetryCounters: Map<string, number> = new Map()

function recordTelemetry(toolName: string): void {
  telemetryCounters.set(toolName, (telemetryCounters.get(toolName) || 0) + 1)
}

/**
 * Get telemetry stats
 */
export function getTelemetryStats(): Record<string, number> {
  return Object.fromEntries(telemetryCounters)
}

/**
 * Reset telemetry (for testing)
 */
export function resetTelemetry(): void {
  telemetryCounters.clear()
}

function withDefaultTransportHeaders(request: Request, parsedBody?: unknown): Request {
  const headers = new Headers(request.headers)

  if (!headers.has('accept')) {
    headers.set('accept', 'application/json, text/event-stream')
  }

  if (!headers.has('mcp-protocol-version')) {
    headers.set('mcp-protocol-version', MCP_PROTOCOL_VERSION)
  }

  if (parsedBody === undefined && request.method !== 'GET' && request.method !== 'HEAD') {
    return new Request(request.url, {
      method: request.method,
      headers,
      body: request.body,
      duplex: 'half'
    } as RequestInit & { duplex: 'half' })
  }

  return new Request(request.url, {
    method: request.method,
    headers
  })
}

/**
 * Create an SDK-backed MCP server instance with tools, resources, and prompts.
 */
export function createMcpServer(
  getRules: () => Rule[] | Promise<Rule[]>,
  getChecklists: () => CuratedChecklist[] = () => [],
  options: McpServerOptions = {}
) {
  const maxResponseChars = options.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS
  const telemetryEnabled = options.telemetryEnabled !== false
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions: MCP_SERVER_INSTRUCTIONS,
    capabilities: {
      tools: {},
      prompts: {},
      resources: {}
    }
  })

  registerTools(
    server,
    getRules,
    getChecklists,
    maxResponseChars,
    telemetryEnabled,
    recordTelemetry
  )
  registerResources(
    server,
    getRules,
    getChecklists,
    MCP_RESOURCE_TEMPLATES.rule,
    MCP_RESOURCE_TEMPLATES.checklist
  )
  registerPrompts(server, getChecklists)

  return server
}

/**
 * Handle a single HTTP request using a fresh stateless SDK transport.
 */
export async function handleMcpHttpRequest(
  request: Request,
  getRules: () => Rule[] | Promise<Rule[]>,
  getChecklists: () => CuratedChecklist[] = () => [],
  options: McpServerOptions = {},
  parsedBody?: unknown
) {
  const server = createMcpServer(getRules, getChecklists, options)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  })
  const normalizedRequest = withDefaultTransportHeaders(request, parsedBody)

  try {
    await server.connect(transport)
    return await transport.handleRequest(
      normalizedRequest,
      parsedBody === undefined ? undefined : { parsedBody }
    )
  } finally {
    await transport.close()
    await server.close()
  }
}

export type FrontendChecklistMcpServer = ReturnType<typeof createMcpServer>
