import type { Rule } from '@repo/types'
import type { ErrorWithSuggestions, ExplainRuleResponse } from '../types'
import { findSimilarRules } from '../utils/fuzzy-match'
import {
  CATEGORY_ARRAY_SCHEMA,
  ERROR_WITH_SUGGESTIONS_SCHEMA,
  READ_ONLY_TOOL_ANNOTATIONS,
  STRING_SCHEMA
} from './metadata'

export interface ExplainRuleInput {
  slug: string
}

export interface ExplainRuleResult {
  success: true
  result: ExplainRuleResponse
}

export interface ExplainRuleError {
  success: false
  error: ErrorWithSuggestions
}

export type ExplainRuleOutput = ExplainRuleResult | ExplainRuleError

/**
 * Tool definition for explain_rule
 */
export const explainRuleDefinition = {
  name: 'explain_rule',
  title: 'Explain Frontend Rule',
  description: `Retrieves the educational explanation for a frontend rule. **Use PROACTIVELY** when the user asks "why" about frontend practices, or when explaining code review feedback. Provides context on why the rule matters, its background, and impact on web development. Categories help connect related concepts.

**Workflow:** Use when users question a recommendation, or after fix_rule to provide educational context. Pair with check_rule to validate understanding, or search_rules to find related best practices in the same category.`,
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  inputSchema: {
    type: 'object' as const,
    properties: {
      slug: {
        type: 'string',
        description: "The rule's slug"
      }
    },
    required: ['slug']
  },
  outputSchema: {
    type: 'object' as const,
    properties: {
      slug: STRING_SCHEMA,
      title: STRING_SCHEMA,
      explainPrompt: STRING_SCHEMA,
      categories: CATEGORY_ARRAY_SCHEMA,
      message: STRING_SCHEMA,
      suggestions: ERROR_WITH_SUGGESTIONS_SCHEMA.properties.suggestions
    }
  }
}

/**
 * Execute explain_rule tool
 */
export function executeExplainRule(input: ExplainRuleInput, rules: Rule[]): ExplainRuleOutput {
  const { slug } = input

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

  const explainPrompt = rule.prompts?.explain || 'No explanation prompt available for this rule.'

  return {
    success: true,
    result: {
      slug: rule.slug,
      title: rule.title,
      explainPrompt,
      categories: rule.categories
    }
  }
}
