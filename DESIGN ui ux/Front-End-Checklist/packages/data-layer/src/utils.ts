import { SEARCH } from '@repo/config'
import type { Rule } from '@repo/types'

/**
 * Fetch all rules from data source
 * @returns Promise resolving to array of rules
 */
export async function fetchRules(): Promise<Rule[]> {
  // In production, this will fetch from content collections
  // For now, return mock data for testing
  if (typeof window !== 'undefined') {
    const global = window as any
    if (global.__RULES_DATA__) {
      return global.__RULES_DATA__
    }
  }

  // This will be replaced with actual content collections data
  return []
}

/**
 * Fetch a single rule by slug
 * @param slug - The rule slug
 * @returns Promise resolving to rule or null if not found
 */
export async function fetchRuleBySlug(slug: string): Promise<Rule | null> {
  const rules = await fetchRules()
  return rules.find(rule => rule.slug === slug) || null
}

/**
 * Resolve the canonical-url progress key for a rule.
 * Prefer a stable rule id when available, fallback to slug.
 */
export function resolveRuleKey(rule: Rule): string {
  const maybeId = Reflect.get(rule, 'id')
  return typeof maybeId === 'string' && maybeId.length > 0 ? maybeId : rule.slug
}

// Simple search implementation - will be enhanced with @repo/search package
/**
 * Search rules by query string
 * @param query - The search query
 * @param rules - Optional rules array to search in
 * @returns Promise resolving to filtered rules
 */
export async function searchRules(query: string, rules?: Rule[]): Promise<Rule[]> {
  if (query.length < SEARCH.MIN_QUERY_LENGTH) {
    return []
  }

  const allRules = rules || (await fetchRules())
  const searchQuery = query.toLowerCase()

  // Score each rule based on matches
  const scoredRules: Array<{ rule: Rule; score: number }> = []
  for (const rule of allRules) {
    let score = 0

    // Title match (highest weight)
    if (rule.title.toLowerCase().includes(searchQuery)) {
      score += 10
      if (rule.title.toLowerCase().startsWith(searchQuery)) {
        score += 5
      }
    }

    // Category match
    for (const category of rule.categories) {
      if (category.toLowerCase().includes(searchQuery)) {
        score += 5
        break
      }
    }

    // Priority match
    if (rule.priority.toLowerCase().includes(searchQuery)) {
      score += 3
    }

    // Content match (lowest weight)
    if (rule.content.toLowerCase().includes(searchQuery)) {
      score += 1
    }

    // Prompts match
    if (rule.prompts) {
      if (
        rule.prompts.check.toLowerCase().includes(searchQuery) ||
        rule.prompts.fix.toLowerCase().includes(searchQuery) ||
        rule.prompts.explain.toLowerCase().includes(searchQuery)
      ) {
        score += 2
      }
    }

    scoredRules.push({ rule, score })
  }

  // Filter out non-matches and sort by score
  return scoredRules
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SEARCH.MAX_RESULTS)
    .map(item => item.rule)
}

// Highlight search terms in text
/**
 * Highlight search terms in text
 * @param text - The text to highlight
 * @param query - The search query
 * @returns Text with highlighted terms
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query || query.length < SEARCH.MIN_QUERY_LENGTH) {
    return text
  }

  const searchTerms = query
    .toLowerCase()
    .split(' ')
    .filter(term => term.length > 0)
  let highlightedText = text

  for (const term of searchTerms) {
    const regex = new RegExp(`(${term})`, 'gi')
    highlightedText = highlightedText.replace(
      regex,
      `<${SEARCH.HIGHLIGHT_TAG}>$1</${SEARCH.HIGHLIGHT_TAG}>`
    )
  }

  return highlightedText
}

// Group rules by category
/**
 * Group rules by category
 * @param rules - Array of rules to group
 * @returns Map of category to rules
 */
export function groupRulesByCategory(rules: Rule[]): Map<string, Rule[]> {
  const grouped = new Map<string, Rule[]>()

  for (const rule of rules) {
    // Use primary category for grouping
    const category = rule.primaryCategory || rule.categories[0]
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category)!.push(rule)
  }

  return grouped
}

// Group rules by priority
/**
 * Group rules by priority
 * @param rules - Array of rules to group
 * @returns Map of priority to rules
 */
export function groupRulesByPriority(rules: Rule[]): Map<string, Rule[]> {
  const grouped = new Map<string, Rule[]>()

  for (const rule of rules) {
    if (!grouped.has(rule.priority)) {
      grouped.set(rule.priority, [])
    }
    grouped.get(rule.priority)!.push(rule)
  }

  return grouped
}

// Sort rules
/**
 * Sort rules by field and order
 * @param rules - Array of rules to sort
 * @param field - Field to sort by
 * @param order - Sort order
 * @returns Sorted rules array
 */
export function sortRules(
  rules: Rule[],
  sortBy: 'priority' | 'category' | 'alphabetical' = 'priority',
  order: 'asc' | 'desc' = 'asc'
): Rule[] {
  const sorted = [...rules]

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
        break
      case 'category':
        comparison = (a.primaryCategory || a.categories[0]).localeCompare(
          b.primaryCategory || b.categories[0]
        )
        break
      case 'alphabetical':
        comparison = a.title.localeCompare(b.title)
        break
    }

    return order === 'asc' ? comparison : -comparison
  })

  return sorted
}

// Calculate progress statistics
/**
 * Calculate progress statistics
 * @param rules - Array of rules
 * @param progress - Array of user progress
 * @returns Progress statistics
 */
export function calculateProgress(
  rules: Rule[],
  progress: Array<{ ruleId: string; completed: boolean }>
): {
  total: number
  completed: number
  remaining: number
  percentage: number
  byCategory: Map<string, { total: number; completed: number }>
  byPriority: Map<string, { total: number; completed: number }>
} {
  const completedSet = new Set<string>()
  for (const item of progress) {
    if (item.completed) {
      completedSet.add(item.ruleId)
    }
  }

  let completed = 0
  for (const rule of rules) {
    if (completedSet.has(resolveRuleKey(rule))) {
      completed++
    }
  }
  const total = rules.length
  const remaining = total - completed
  const percentage = total > 0 ? (completed / total) * 100 : 0

  // Calculate by category
  const byCategory = new Map<string, { total: number; completed: number }>()
  for (const rule of rules) {
    const category = rule.primaryCategory || rule.categories[0]
    if (!byCategory.has(category)) {
      byCategory.set(category, { total: 0, completed: 0 })
    }
    const stats = byCategory.get(category)!
    stats.total++
    if (completedSet.has(resolveRuleKey(rule))) {
      stats.completed++
    }
  }

  // Calculate by priority
  const byPriority = new Map<string, { total: number; completed: number }>()
  for (const rule of rules) {
    if (!byPriority.has(rule.priority)) {
      byPriority.set(rule.priority, { total: 0, completed: 0 })
    }
    const stats = byPriority.get(rule.priority)!
    stats.total++
    if (completedSet.has(resolveRuleKey(rule))) {
      stats.completed++
    }
  }

  return {
    total,
    completed,
    remaining,
    percentage,
    byCategory,
    byPriority
  }
}
