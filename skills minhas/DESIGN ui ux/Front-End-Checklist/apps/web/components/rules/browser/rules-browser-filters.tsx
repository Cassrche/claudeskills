import { cn } from '@repo/utils'
import { SelectFilter } from '@/components/rules/browser/rules-browser-toolbar-components'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

interface RulesBrowserFiltersProps {
  priorityOptions: readonly string[]
  priorityFilter: string
  setPriorityFilter: (value: string | null) => void
  allTags: string[]
  tagFilter: string
  setTagFilter: (value: string | null) => void
  allSubcategories: string[]
  subcategoryFilter: string
  setSubcategoryFilter: (value: string | null) => void
  sortOptions: readonly { value: string; label: string }[]
  sortBy: string
  setSortBy: (value: string) => void
  hasActiveFilters: boolean
  clearFilters: () => void
  showFilters: boolean
}

/** Track a rules browser filter or sort value change. */
function trackFilterChange(label: string, target: string) {
  trackInteraction(TELEMETRY_EVENTS.filterChanged, {
    label,
    location: 'rules_browser_filters',
    target
  })
}

/** Render the expandable filter row for the rules browser toolbar. */
export function RulesBrowserFilters({
  priorityOptions,
  priorityFilter,
  setPriorityFilter,
  allTags,
  tagFilter,
  setTagFilter,
  allSubcategories,
  subcategoryFilter,
  setSubcategoryFilter,
  sortOptions,
  sortBy,
  setSortBy,
  hasActiveFilters,
  clearFilters,
  showFilters
}: RulesBrowserFiltersProps) {
  return (
    <div
      className={cn(
        'flex-col gap-3',
        'sm:flex-row sm:flex-wrap sm:items-center',
        showFilters ? 'flex' : 'hidden'
      )}
    >
      <div className="flex items-center gap-1">
        {priorityOptions.map(priority => (
          <button
            key={priority}
            type="button"
            onClick={() => {
              trackFilterChange('priority_filter', priority)
              setPriorityFilter(priority)
            }}
            aria-pressed={priorityFilter === priority}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors duration-150',
              priorityFilter === priority
                ? 'bg-foreground/15 text-foreground'
                : 'text-foreground-muted hover:bg-foreground/10 hover:text-foreground'
            )}
          >
            {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
          </button>
        ))}
      </div>

      {allTags.length > 2 ? (
        <SelectFilter
          id="tag-filter"
          value={tagFilter}
          onChange={value => {
            trackFilterChange('tag_filter', value)
            setTagFilter(value)
          }}
          active={tagFilter !== 'all'}
          defaultLabel="All tags"
          options={allTags
            .filter(tag => tag !== 'all')
            .map(tag => ({
              value: tag,
              label: tag.charAt(0).toUpperCase() + tag.slice(1)
            }))}
        />
      ) : null}

      {allSubcategories.length > 2 ? (
        <SelectFilter
          id="subcategory-filter"
          value={subcategoryFilter}
          onChange={value => {
            trackFilterChange('subcategory_filter', value)
            setSubcategoryFilter(value)
          }}
          active={subcategoryFilter !== 'all'}
          defaultLabel="All subcategories"
          options={allSubcategories
            .filter(subcat => subcat !== 'all')
            .map(subcat => ({
              value: subcat,
              label: subcat
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }))}
        />
      ) : null}

      <SelectFilter
        id="sort-by"
        value={sortBy}
        onChange={value => {
          trackFilterChange('sort_rules', value)
          setSortBy(value)
        }}
        active={false}
        defaultLabel=""
        options={sortOptions.map(option => ({
          value: option.value,
          label: `Sort: ${option.label}`
        }))}
      />

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={() => {
            trackFilterChange('clear_all_filters', 'all')
            clearFilters()
          }}
          className="text-accent text-sm transition-colors hover:text-accent/80"
        >
          Clear all
        </button>
      ) : null}
    </div>
  )
}
