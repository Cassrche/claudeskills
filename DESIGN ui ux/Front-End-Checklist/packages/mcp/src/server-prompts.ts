import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CuratedChecklist } from '@repo/types'
import * as z from 'zod'

/**
 * Register prompt templates on the MCP server.
 *
 * @param server - MCP server instance.
 * @param getChecklists - Checklist loader callback.
 */
export function registerPrompts(server: McpServer, getChecklists: () => CuratedChecklist[]): void {
  server.registerPrompt(
    'review_code_prompt',
    {
      description: 'Guide the model to review provided frontend code with the review_code tool.',
      argsSchema: {
        code: z.string().optional(),
        focus: z.array(z.string()).optional(),
        minPriority: z.enum(['critical', 'high', 'medium', 'low']).optional()
      }
    },
    async ({ code, focus, minPriority }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Review the frontend code using the `review_code` tool.',
              '`review_code` is a conservative static heuristic pass; zero issues means no provable static issue was found, not that the implementation is automatically clean.',
              ...(code
                ? [`Code:\n${code}`]
                : ['If I provide code next, pass it to `review_code`.']),
              ...(focus && focus.length > 0 ? [`Focus categories: ${focus.join(', ')}`] : []),
              ...(minPriority ? [`Minimum priority: ${minPriority}`] : []),
              'Summarize issues by priority. If there are no issues, follow `review_code` suggestions with `search_rules` or `get_rule` before concluding clean. Call `fix_rule` only when remediation detail is needed.'
            ].join('\n\n')
          }
        }
      ]
    })
  )

  server.registerPrompt(
    'explain_rule_prompt',
    {
      description: 'Guide the model to explain why a frontend rule matters.',
      argsSchema: {
        slug: z.string()
      }
    },
    async ({ slug }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Use the \`explain_rule\` tool for the rule slug \`${slug}\`, then explain the rule in plain language with practical implications.`
          }
        }
      ]
    })
  )

  server.registerPrompt(
    'fix_rule_prompt',
    {
      description: 'Guide the model to retrieve remediation guidance for a specific rule.',
      argsSchema: {
        slug: z.string(),
        codeSnippet: z.string().optional()
      }
    },
    async ({ slug, codeSnippet }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Use the \`fix_rule\` tool for the rule slug \`${slug}\`.`,
              ...(codeSnippet ? [`Provide this code snippet as context:\n${codeSnippet}`] : []),
              'Return concrete remediation steps and highlight any caveats.'
            ].join('\n\n')
          }
        }
      ]
    })
  )

  server.registerPrompt(
    'audit_url_prompt',
    {
      description: 'Guide the model to audit a live website using the audit_url tool.',
      argsSchema: {
        url: z.string(),
        focus: z.array(z.string()).optional(),
        minPriority: z.enum(['critical', 'high', 'medium', 'low']).optional()
      }
    },
    async ({ url, focus, minPriority }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Audit the site \`${url}\` with the \`audit_url\` tool.`,
              ...(focus && focus.length > 0 ? [`Focus categories: ${focus.join(', ')}`] : []),
              ...(minPriority ? [`Minimum priority: ${minPriority}`] : []),
              'Summarize the highest-severity findings first and cite the affected rule slugs.'
            ].join('\n\n')
          }
        }
      ]
    })
  )

  server.registerPrompt(
    'workflow_prompt',
    {
      description: 'Guide the model through a curated frontend checklist workflow.',
      argsSchema: {
        checklist: z.string().describe(
          `Available: ${getChecklists()
            .map(item => item.slug)
            .join(', ')}`
        )
      }
    },
    async ({ checklist }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Use the \`get_workflow\` tool for the checklist slug \`${checklist}\`.`,
              'Then walk through the ordered steps, and fetch rule details or checklist resources when more context is needed.'
            ].join('\n\n')
          }
        }
      ]
    })
  )
}
