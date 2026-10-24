import type { Suggestion } from '../types'

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
export function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  const maxLength = Math.max(a.length, b.length)
  if (maxLength === 0) return 1
  return 1 - distance / maxLength
}

/**
 * Find similar slugs/titles for suggestions
 */
export function findSimilarRules(
  query: string,
  rules: Array<{ slug: string; title: string }>,
  options: {
    maxDistance?: number
    minSimilarity?: number
    maxResults?: number
  } = {}
): Suggestion[] {
  const { maxDistance = 3, minSimilarity = 0.5, maxResults = 5 } = options

  const suggestions: Suggestion[] = []

  for (const rule of rules) {
    // Check slug similarity
    const slugDistance = levenshteinDistance(query.toLowerCase(), rule.slug.toLowerCase())
    const slugSimilarity = calculateSimilarity(query, rule.slug)

    // Check title similarity (lowercase, remove common words)
    const titleWords = rule.title.toLowerCase().split(/\s+/)
    const queryWords = query.toLowerCase().split(/\s+/)

    let titleSimilarity = 0
    for (const qWord of queryWords) {
      for (const tWord of titleWords) {
        const wordSim = calculateSimilarity(qWord, tWord)
        if (wordSim > titleSimilarity) {
          titleSimilarity = wordSim
        }
      }
    }

    // Use the better of slug or title similarity
    const similarity = Math.max(slugSimilarity, titleSimilarity * 0.9)

    if (slugDistance <= maxDistance || similarity >= minSimilarity) {
      suggestions.push({
        slug: rule.slug,
        title: rule.title,
        similarity: Math.round(similarity * 100) / 100
      })
    }
  }

  // Sort by similarity (descending) and limit results
  return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, maxResults)
}

/**
 * Find similar category names
 */
export function findSimilarCategories(
  query: string,
  categories: string[],
  maxResults = 3
): string[] {
  const suggestions = categories
    .map(cat => ({
      category: cat,
      similarity: calculateSimilarity(query, cat)
    }))
    .filter(s => s.similarity >= 0.4)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)

  return suggestions.map(s => s.category)
}
