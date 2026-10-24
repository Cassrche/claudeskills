import { CategoryQuickNav } from '@/components/navigation/quick-nav/category-quick-nav'
import { render, screen } from '@/test-utils'

jest.mock('@/hooks/use-progress', () => ({
  useProgress: () => ({
    getCompletionStats: (ruleIds: string[]) => {
      if (ruleIds.includes('complete')) {
        return { completed: ruleIds.length, total: ruleIds.length, percentage: 100, remaining: 0 }
      }

      return { completed: 1, total: ruleIds.length, percentage: 50, remaining: 1 }
    }
  })
}))

describe('CategoryQuickNav', () => {
  it('renders progress pills with anchors and completion state', () => {
    render(
      <CategoryQuickNav
        categories={[
          { slug: 'html', title: 'HTML', ruleCount: 2, ruleIds: ['partial', 'other'] },
          { slug: 'css', title: 'CSS', ruleCount: 1, ruleIds: ['complete'] }
        ]}
      />
    )

    expect(screen.getByRole('link', { name: /HTML/ })).toHaveAttribute('href', '#html')
    expect(screen.getByRole('link', { name: /CSS/ })).toHaveAttribute('href', '#css')
    expect(screen.getByLabelText('50% complete')).toBeInTheDocument()
    expect(screen.getByLabelText('Complete')).toBeInTheDocument()
  })
})
