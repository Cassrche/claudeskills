'use client'

import {
  CheckSquare,
  ChevronsDownUp,
  ChevronsUpDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
  X
} from '@repo/design-system/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@repo/design-system/ui/tooltip'
import { cn } from '@repo/utils'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'
import { RulesBrowserFilters } from './rules-browser-filters'
import { RulesBrowserResetDialog } from './rules-browser-reset-dialog'
import { ToolbarButton } from './rules-browser-toolbar-components'

export interface RulesBrowserToolbarProps {
  search: string
  setSearch: (value: string | null) => void
  showFilters: boolean
  setShowFilters: (value: boolean) => void
  hasActiveFilters: boolean
  activeFilterCount: number
  hasAnyExpanded: boolean
  allRulesChecked: boolean
  handleCollapseAll: () => void
  handleExpandAll: () => void
  handleUncheckAll: () => void
  handleCheckAll: () => void
  handleResetClick: () => void
  showResetConfirm: boolean
  handleConfirmReset: () => void
  handleCancelReset: () => void
  completionStats: { completed: number; total: number }
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
  clearFilters: () => void
}
/** Renders search, filter, and sort controls for the rules browser. */
export function RulesBrowserToolbar({
  search,
  setSearch,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  activeFilterCount,
  hasAnyExpanded,
  allRulesChecked,
  handleCollapseAll,
  handleExpandAll,
  handleUncheckAll,
  handleCheckAll,
  handleResetClick,
  showResetConfirm,
  handleConfirmReset,
  handleCancelReset,
  completionStats,
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
  clearFilters
}: RulesBrowserToolbarProps) {
  /** Track and clear the current search query. */
  const handleClearSearch = () => {
    trackInteraction(TELEMETRY_EVENTS.filterChanged, {
      label: 'clear_rules_search',
      location: 'rules_browser_toolbar',
      target: 'search'
    })
    setSearch('')
  }

  /** Toggle filter visibility and record the explicit toolbar action. */
  const handleToggleFilters = () => {
    const nextVisible = !showFilters
    trackInteraction(TELEMETRY_EVENTS.filterChanged, {
      label: nextVisible ? 'show_filters' : 'hide_filters',
      location: 'rules_browser_toolbar',
      target: 'filters'
    })
    setShowFilters(nextVisible)
  }
  /** Track and run the bulk expand/collapse command. */
  const handleExpandCollapseClick = () => {
    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      label: hasAnyExpanded ? 'collapse_all_rules' : 'expand_all_rules',
      location: 'rules_browser_toolbar',
      target: 'rules_browser'
    })
    if (hasAnyExpanded) {
      handleCollapseAll()
    } else {
      handleExpandAll()
    }
  }

  /** Track and run the bulk complete/incomplete command. */
  const handleCheckToggleClick = () => {
    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      label: allRulesChecked ? 'uncheck_all_rules' : 'check_all_rules',
      location: 'rules_browser_toolbar',
      target: 'rules_browser'
    })
    if (allRulesChecked) {
      handleUncheckAll()
    } else {
      handleCheckAll()
    }
  }

  /** Track the reset-progress intent before the confirmation dialog opens. */
  const handleTrackedResetClick = () => {
    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      label: 'reset_progress',
      location: 'rules_browser_toolbar',
      target: 'rules_browser'
    })
    handleResetClick()
  }
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <label htmlFor="rules-search" className="sr-only">
            Search rules
          </label>
          <Search
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            aria-hidden="true"
          />
          <input
            id="rules-search"
            type="search"
            placeholder="Search rules..."
            value={search || ''}
            onChange={e => setSearch(e.target.value || null)}
            className={cn(
              'h-10 w-full rounded-md pr-10 pl-10',
              'border border-foreground/30 bg-transparent',
              'text-foreground text-sm placeholder:text-foreground-muted',
              'focus:border-foreground/50 focus:outline-none',
              'transition-colors duration-150'
            )}
          />
          {search ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 transition-colors hover:bg-foreground/10"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-foreground-muted" />
            </button>
          ) : null}
        </div>

        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleToggleFilters}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-md px-3',
                    'text-foreground-muted text-sm',
                    'hover:bg-foreground/10 hover:text-foreground',
                    'transition-colors duration-150',
                    hasActiveFilters && 'text-accent'
                  )}
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 font-medium text-accent-foreground text-xs">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {showFilters ? 'Hide filters' : 'Show filters'}
              </TooltipContent>
            </Tooltip>

            <ToolbarButton
              label={hasAnyExpanded ? 'Collapse all rules' : 'Expand all rules'}
              onClick={handleExpandCollapseClick}
            >
              {hasAnyExpanded ? (
                <>
                  <ChevronsDownUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </ToolbarButton>

            <ToolbarButton
              label={allRulesChecked ? 'Uncheck all rules' : 'Check all rules'}
              onClick={handleCheckToggleClick}
            >
              {allRulesChecked ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Uncheck</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span className="hidden sm:inline">Check</span>
                </>
              )}
            </ToolbarButton>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleTrackedResetClick}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md',
                    'text-foreground-muted hover:text-foreground',
                    'hover:bg-foreground/10',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-accent/50'
                  )}
                  aria-label="Reset progress"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset progress</TooltipContent>
            </Tooltip>

            <RulesBrowserResetDialog
              isOpen={showResetConfirm}
              completedCount={completionStats.completed}
              onConfirm={handleConfirmReset}
              onCancel={handleCancelReset}
            />
          </div>
        </TooltipProvider>
      </div>

      <RulesBrowserFilters
        priorityOptions={priorityOptions}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        allTags={allTags}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        allSubcategories={allSubcategories}
        subcategoryFilter={subcategoryFilter}
        setSubcategoryFilter={setSubcategoryFilter}
        sortOptions={sortOptions}
        sortBy={sortBy}
        setSortBy={setSortBy}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        showFilters={showFilters}
      />
    </>
  )
}
