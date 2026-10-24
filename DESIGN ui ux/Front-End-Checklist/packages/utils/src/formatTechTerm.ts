/**
 * Mapping of lowercase tech terms to their proper display format.
 * Acronyms like HTML, CSS, SEO are fully uppercase.
 * Mixed-case terms like JavaScript have specific casing.
 */
const techTerms: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  seo: 'SEO',
  // Standard capitalization for others
  performance: 'Performance',
  accessibility: 'Accessibility',
  images: 'Images',
  security: 'Security',
  testing: 'Testing',
  general: 'General'
}

/**
 * Formats a tech term to its proper display casing.
 * Handles acronyms (HTML, CSS, SEO) and mixed-case terms (JavaScript).
 * Falls back to standard title case for unknown terms.
 *
 * @param term - The term to format (case-insensitive)
 * @returns The properly formatted term
 *
 * @example
 * formatTechTerm('html') // 'HTML'
 * formatTechTerm('javascript') // 'JavaScript'
 * formatTechTerm('unknown') // 'Unknown'
 */
export function formatTechTerm(term: string): string {
  const lower = term.toLowerCase()
  return techTerms[lower] ?? term.charAt(0).toUpperCase() + term.slice(1)
}
