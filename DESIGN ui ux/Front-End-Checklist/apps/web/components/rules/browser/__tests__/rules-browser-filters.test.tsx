import { fireEvent, render, screen } from '@testing-library/react'
import { RulesBrowserFilters } from '@/components/rules/browser/rules-browser-filters'

jest.mock('@/lib/telemetry-interactions', () => ({
  trackInteraction: jest.fn()
}))

const { trackInteraction } = require('@/lib/telemetry-interactions')

describe('RulesBrowserFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tracks filter changes', () => {
    const setPriorityFilter = jest.fn()

    render(
      <RulesBrowserFilters
        priorityOptions={['all', 'critical']}
        priorityFilter="all"
        setPriorityFilter={setPriorityFilter}
        allTags={[]}
        tagFilter="all"
        setTagFilter={jest.fn()}
        allSubcategories={[]}
        subcategoryFilter="all"
        setSubcategoryFilter={jest.fn()}
        sortOptions={[{ value: 'priority', label: 'Priority' }]}
        sortBy="priority"
        setSortBy={jest.fn()}
        hasActiveFilters={false}
        clearFilters={jest.fn()}
        showFilters={true}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Critical' }))

    expect(trackInteraction).toHaveBeenCalledWith('filter_changed', {
      label: 'priority_filter',
      location: 'rules_browser_filters',
      target: 'critical'
    })
    expect(setPriorityFilter).toHaveBeenCalledWith('critical')
  })
})
