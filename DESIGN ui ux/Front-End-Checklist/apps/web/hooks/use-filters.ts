import { parseAsArrayOf, parseAsString, parseAsStringEnum, useQueryState } from 'nuqs'

/** Provides URL-synced filter state (search, categories, priority, difficulty, sort). */
export function useFilters() {
  // Search query
  const [search, setSearch] = useQueryState('search', parseAsString.withDefault(''))

  // Selected categories
  const [categories, setCategories] = useQueryState(
    'categories',
    parseAsArrayOf(parseAsString).withDefault([])
  )

  // Priority filter
  const [priority, setPriority] = useQueryState(
    'priority',
    parseAsStringEnum(['critical', 'high', 'medium', 'low']).withDefault('all' as any)
  )

  // Difficulty filter
  const [difficulty, setDifficulty] = useQueryState(
    'difficulty',
    parseAsStringEnum(['beginner', 'intermediate', 'advanced', 'expert']).withDefault('all' as any)
  )

  // Sort option
  const [sort, setSort] = useQueryState(
    'sort',
    parseAsStringEnum(['title', 'priority', 'difficulty', 'category']).withDefault('title')
  )

  // Sort direction
  const [order, setOrder] = useQueryState(
    'order',
    parseAsStringEnum(['asc', 'desc']).withDefault('asc')
  )

  /** Resets all filter and sort values to their defaults. */
  const clearFilters = () => {
    setSearch('')
    setCategories([])
    setPriority('all' as any)
    setDifficulty('all' as any)
    setSort('title')
    setOrder('asc')
  }

  return {
    search,
    setSearch,
    categories,
    setCategories,
    priority,
    setPriority,
    difficulty,
    setDifficulty,
    sort,
    setSort,
    order,
    setOrder,
    clearFilters
  }
}
