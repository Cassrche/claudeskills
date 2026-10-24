import type { Rule } from '@repo/types'
import type { ErrorWithSuggestions, FixRuleResponse } from '../types'
import { findSimilarRules } from '../utils/fuzzy-match'
import {
  ERROR_WITH_SUGGESTIONS_SCHEMA,
  PRIORITY_SCHEMA,
  READ_ONLY_TOOL_ANNOTATIONS,
  STRING_SCHEMA
} from './metadata'

export interface FixRuleInput {
  slug: string
  codeSnippet?: string
}

export interface FixRuleResult {
  success: true
  result: FixRuleResponse
}

export interface FixRuleError {
  success: false
  error: ErrorWithSuggestions
}

export type FixRuleOutput = FixRuleResult | FixRuleError

/**
 * Tool definition for fix_rule
 */
export const fixRuleDefinition = {
  name: 'fix_rule',
  title: 'Get Rule Fix',
  description: `Retrieves the fix/implementation prompt for a specific rule. **Use PROACTIVELY** after identifying issues in frontend code to get step-by-step remediation guidance. Returns detailed instructions on how to fix the issue correctly, with priority level to help triage multiple issues.

**Workflow:** Use after review_code or check_rule identifies issues. Pair with get_rule for complete context, or explain_rule to help users understand the importance of the fix.`,
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  inputSchema: {
    type: 'object' as const,
    properties: {
      slug: {
        type: 'string',
        description: "The rule's slug"
      },
      codeSnippet: {
        type: 'string',
        description: 'Optional: code or HTML snippet for context-aware fix suggestion'
      }
    },
    required: ['slug']
  },
  outputSchema: {
    type: 'object' as const,
    properties: {
      slug: STRING_SCHEMA,
      title: STRING_SCHEMA,
      fixPrompt: STRING_SCHEMA,
      priority: PRIORITY_SCHEMA,
      codeContext: STRING_SCHEMA,
      message: STRING_SCHEMA,
      suggestions: ERROR_WITH_SUGGESTIONS_SCHEMA.properties.suggestions
    }
  }
}

/**
 * Execute fix_rule tool
 */
export function executeFixRule(input: FixRuleInput, rules: Rule[]): FixRuleOutput {
  const { slug, codeSnippet } = input

  // Find rule by slug
  const rule = rules.find(r => r.slug === slug)

  if (!rule) {
    const suggestions = findSimilarRules(
      slug,
      rules.map(r => ({ slug: r.slug, title: r.title }))
    )

    return {
      success: false,
      error: {
        error: null,
        result: null,
        suggestions,
        message: `Rule '${slug}' not found.${suggestions.length > 0 ? ' Did you mean one of these?' : ''}`
      }
    }
  }

  const fixPrompt = rule.prompts?.fix || 'No fix prompt available for this rule.'

  const result: FixRuleResponse = {
    slug: rule.slug,
    title: rule.title,
    fixPrompt,
    priority: rule.priority,
    ...(codeSnippet?.trim() ? { codeContext: codeSnippet.trim() } : {})
  }
  return {
    success: true,
    result
  }
}
