import { SEARCH, STORAGE_KEYS } from '@repo/config'
import { storage } from '@repo/storage'
import type { Category, Priority, Rule, SearchResult } from '@repo/types'
import FlexSearch from 'flexsearch'
import Fuse from 'fuse.js'

type Index = InstanceType<typeof FlexSearch.Index>
type SearchId = string | number
type SearchOptions = {
  categories?: Category[]
  priorities?: Priority[]
  limit?: number
  fuzzy?: boolean
}

/** Check whether an unknown FlexSearch result is a valid document id. */
function isSearchId(value: unknown): value is SearchId {
  return typeof value === 'string' || typeof value === 'number'
}

/** Normalize FlexSearch results into ids this package can score. */
function getSearchIds(results: unknown): SearchId[] {
  return Array.isArray(results) ? results.filter(isSearchId) : []
}

/** Normalize Fuse match ranges into mutable tuple ranges. */
function getMatchIndices(
  indices: readonly (readonly [number, number])[] | undefined
): [number, number][] {
  return indices?.map(([start, end]) => [start, end]) ?? []
}

/** Manage in-browser rule search indexes and search history. */
export class SearchIndex {
  private titleIndex: Index
  private contentIndex: Index
  private categoryIndex: Index
  private promptsIndex: Index
  private rules: Map<string, Rule> = new Map()
  private fuseInstance: Fuse<Rule> | null = null
  private searchHistory: string[] = []
  private lastQuery = ''
  private lastResults: SearchResult[] = []

  constructor() {
    this.titleIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 9,
      context: {
        resolution: 9,
        depth: 4,
        bidirectional: true
      }
    })

    this.contentIndex = new FlexSearch.Index({
      tokenize: 'full',
      resolution: 9,
      context: {
        resolution: 9,
        depth: 3,
        bidirectional: false
      }
    })

    this.categoryIndex = new FlexSearch.Index({
      tokenize: 'strict',
      resolution: 9
    })

    this.promptsIndex = new FlexSearch.Index({
      tokenize: 'full',
      resolution: 9,
      context: {
        resolution: 9,
        depth: 2,
        bidirectional: false
      }
    })

    this.loadSearchHistory()
  }

  async indexRules(rules: Rule[]): Promise<void> {
    this.clear()

    rules.forEach(rule => {
      this.rules.set(rule.slug, rule)
    })

    rules.forEach(rule => {
      const id = rule.slug

      this.titleIndex.add(id, rule.title)

      this.contentIndex.add(id, rule.content)

      this.categoryIndex.add(id, rule.categories.join(' '))

      if (rule.prompts) {
        const promptText = `${rule.prompts.check} ${rule.prompts.fix} ${rule.prompts.explain}`
        this.promptsIndex.add(id, promptText)
      }
    })

    // Initialize Fuse for fuzzy search fallback
    this.fuseInstance = new Fuse(rules, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.3 },
        { name: 'categories', weight: 0.2 },
        { name: 'prompts.check', weight: 0.1 },
        { name: 'prompts.fix', weight: 0.05 },
        { name: 'prompts.explain', weight: 0.05 }
      ],
      threshold: SEARCH.FUZZY_THRESHOLD,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      shouldSort: true
    })
  }

  /** Search indexed rules with optional category, priority, and fuzzy filters. */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!query || query.length < SEARCH.MIN_QUERY_LENGTH) {
      return []
    }

    // Check cache for same query
    if (query === this.lastQuery && this.lastResults.length > 0) {
      return this.applyFilters(this.lastResults, options)
    }

    const searchQuery = query.toLowerCase()
    const scoreMap = new Map<string, number>()
    const matchMap = new Map<string, Array<{ field: string; indices: Array<[number, number]> }>>()

    const titleResults = getSearchIds(
      await this.titleIndex.searchAsync(searchQuery, {
        limit: 100
      })
    )
    titleResults.forEach(id => {
      const ruleId = String(id)
      scoreMap.set(ruleId, (scoreMap.get(ruleId) || 0) + 10)
      this.addMatch(matchMap, ruleId, 'title', query)
    })

    const contentResults = getSearchIds(
      await this.contentIndex.searchAsync(searchQuery, {
        limit: 100
      })
    )
    contentResults.forEach(id => {
      const ruleId = String(id)
      scoreMap.set(ruleId, (scoreMap.get(ruleId) || 0) + 5)
      this.addMatch(matchMap, ruleId, 'content', query)
    })

    const categoryResults = getSearchIds(
      await this.categoryIndex.searchAsync(searchQuery, {
        limit: 100
      })
    )
    categoryResults.forEach(id => {
      const ruleId = String(id)
      scoreMap.set(ruleId, (scoreMap.get(ruleId) || 0) + 3)
      this.addMatch(matchMap, ruleId, 'categories', query)
    })

    const promptsResults = getSearchIds(
      await this.promptsIndex.searchAsync(searchQuery, {
        limit: 100
      })
    )
    promptsResults.forEach(id => {
      const ruleId = String(id)
      scoreMap.set(ruleId, (scoreMap.get(ruleId) || 0) + 2)
      this.addMatch(matchMap, ruleId, 'prompts', query)
    })

    // Convert to SearchResult array
    let results: SearchResult[] = Array.from(scoreMap.entries())
      .map(([id, score]) => ({
        rule: this.rules.get(id)!,
        score,
        matches: matchMap.get(id) || []
      }))
      .filter(result => result.rule) // Filter out any missing rules
      .sort((a, b) => b.score - a.score)

    // If no results and fuzzy search is enabled, use Fuse
    if (results.length === 0 && options?.fuzzy !== false && this.fuseInstance) {
      const fuseResults = this.fuseInstance.search(query)
      results = fuseResults.map(result => ({
        rule: result.item,
        score: (1 - (result.score || 0)) * 10, // Convert Fuse score to our scale
        matches: (result.matches || []).map(match => ({
          field: match.key || '',
          indices: getMatchIndices(match.indices)
        }))
      }))
    }

    // Apply filters
    results = this.applyFilters(results, options)

    // Limit results
    const limit = options?.limit || SEARCH.MAX_RESULTS
    results = results.slice(0, limit)

    // Cache results
    this.lastQuery = query
    this.lastResults = results

    // Add to search history
    await this.addToHistory(query)

    return results
  }

  // Search suggestions based on partial query
  async getSuggestions(partial: string, limit = 10): Promise<string[]> {
    if (!partial || partial.length < 1) {
      return []
    }

    const suggestions = new Set<string>()
    const searchQuery = partial.toLowerCase()

    // Get title suggestions
    const titleResults = getSearchIds(
      await this.titleIndex.searchAsync(searchQuery, {
        limit: limit * 2
      })
    )
    titleResults.forEach(id => {
      const rule = this.rules.get(String(id))
      if (rule) {
        // Add matching words from title
        const words = rule.title.toLowerCase().split(' ')
        words.forEach(word => {
          if (word.startsWith(searchQuery)) {
            suggestions.add(word)
          }
        })
      }
    })

    // Add from search history
    this.searchHistory.forEach(historyQuery => {
      if (historyQuery.toLowerCase().startsWith(searchQuery)) {
        suggestions.add(historyQuery)
      }
    })

    return Array.from(suggestions).slice(0, limit)
  }

  // Highlight search terms in text
  highlightTerms(text: string, query: string): string {
    if (!query || query.length < SEARCH.MIN_QUERY_LENGTH) {
      return text
    }

    const searchTerms = query
      .toLowerCase()
      .split(' ')
      .filter(term => term.length > 0)
    let highlightedText = text

    searchTerms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi')
      highlightedText = highlightedText.replace(
        regex,
        `<${SEARCH.HIGHLIGHT_TAG}>$1</${SEARCH.HIGHLIGHT_TAG}>`
      )
    })

    return highlightedText
  }

  // Apply category and priority filters
  private applyFilters(
    results: SearchResult[],
    options?: {
      categories?: Category[]
      priorities?: Priority[]
    }
  ): SearchResult[] {
    if (!options) return results

    let filtered = [...results]

    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(result =>
        result.rule.categories.some(cat => options.categories?.includes(cat))
      )
    }

    if (options.priorities && options.priorities.length > 0) {
      filtered = filtered.filter(result => options.priorities?.includes(result.rule.priority))
    }

    return filtered
  }

  // Add match information
  private addMatch(
    matchMap: Map<string, Array<{ field: string; indices: Array<[number, number]> }>>,
    id: string,
    field: string,
    query: string
  ): void {
    const rule = this.rules.get(id)
    if (!rule) return

    const matches = matchMap.get(id) || []
    const fieldValue = this.getFieldValue(rule, field)
    const indices = this.findIndices(fieldValue, query)

    if (indices.length > 0) {
      matches.push({ field, indices })
      matchMap.set(id, matches)
    }
  }

  // Get field value from rule
  private getFieldValue(rule: Rule, field: string): string {
    switch (field) {
      case 'title':
        return rule.title
      case 'content':
        return rule.content
      case 'categories':
        return rule.categories.join(' ')
      case 'prompts':
        return rule.prompts
          ? `${rule.prompts.check} ${rule.prompts.fix} ${rule.prompts.explain}`
          : ''
      default:
        return ''
    }
  }

  // Find indices of query in text
  private findIndices(text: string, query: string): Array<[number, number]> {
    const indices: Array<[number, number]> = []
    const searchText = text.toLowerCase()
    const searchQuery = query.toLowerCase()
    let index = searchText.indexOf(searchQuery)

    while (index !== -1) {
      indices.push([index, index + searchQuery.length])
      index = searchText.indexOf(searchQuery, index + 1)
    }

    return indices
  }

  // Escape regex special characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Search history management
  private async loadSearchHistory(): Promise<void> {
    const history = storage.getLocal<string[]>(STORAGE_KEYS.SEARCH_HISTORY)
    if (history) {
      this.searchHistory = history
    }
  }

  private async addToHistory(query: string): Promise<void> {
    // Remove duplicates and add to beginning
    this.searchHistory = [query, ...this.searchHistory.filter(q => q !== query)].slice(0, 20) // Keep last 20 searches

    storage.setLocal(STORAGE_KEYS.SEARCH_HISTORY, this.searchHistory)
  }

  async clearHistory(): Promise<void> {
    this.searchHistory = []
    storage.removeLocal(STORAGE_KEYS.SEARCH_HISTORY)
  }

  getSearchHistory(): string[] {
    return [...this.searchHistory]
  }

  // Clear all indexes
  clear(): void {
    this.rules.clear()
    this.lastQuery = ''
    this.lastResults = []
    // Note: FlexSearch doesn't have a clear method, so we recreate indexes
    this.titleIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 9,
      context: {
        resolution: 9,
        depth: 4,
        bidirectional: true
      }
    })
    this.contentIndex = new FlexSearch.Index({
      tokenize: 'full',
      resolution: 9,
      context: {
        resolution: 9,
        depth: 3,
        bidirectional: false
      }
    })
    this.categoryIndex = new FlexSearch.Index({
      tokenize: 'strict',
      resolution: 9
    })
    this.promptsIndex = new FlexSearch.Index({
      tokenize: 'full',
      resolution: 9,
      context: {
        resolution: 9,
        depth: 2,
        bidirectional: false
      }
    })
  }

  // Get index statistics
  getStats(): {
    totalRules: number
    indexedFields: string[]
    searchHistoryCount: number
    cacheHit: boolean
  } {
    return {
      totalRules: this.rules.size,
      indexedFields: ['title', 'content', 'categories', 'prompts'],
      searchHistoryCount: this.searchHistory.length,
      cacheHit: this.lastQuery !== ''
    }
  }
}

// Create singleton instance
export const searchIndex = new SearchIndex()

/** Index rules in the shared search manager. */
function indexRules(rules: Rule[]) {
  return searchIndex.indexRules(rules)
}

/** Search rules through the shared search manager. */
function search(query: string, options?: SearchOptions) {
  return searchIndex.search(query, options)
}

/** Return search suggestions from the shared search manager. */
function getSuggestions(partial: string, limit?: number) {
  return searchIndex.getSuggestions(partial, limit)
}

/** Highlight matching search terms in text. */
function highlightTerms(text: string, query: string) {
  return searchIndex.highlightTerms(text, query)
}

/** Return persisted search history entries. */
function getSearchHistory() {
  return searchIndex.getSearchHistory()
}

/** Clear persisted search history entries. */
function clearSearchHistory() {
  return searchIndex.clearHistory()
}

/** Clear all in-memory search indexes. */
function clearSearchIndex() {
  return searchIndex.clear()
}

/** Return search index statistics. */
function getSearchStats() {
  return searchIndex.getStats()
}

export {
  clearSearchHistory,
  clearSearchIndex,
  getSearchHistory,
  getSearchStats,
  getSuggestions,
  highlightTerms,
  indexRules,
  search
}
