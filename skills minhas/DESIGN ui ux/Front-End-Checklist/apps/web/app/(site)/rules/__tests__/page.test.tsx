import { render, screen } from '@/test-utils'

jest.mock('@/components/rules/detail/share-button', () => ({
  ShareButton: ({ title }: { title: string }) => <button type="button">{title}</button>
}))

jest.mock('@/components/rules/browser/rules-browser', () => ({
  RulesBrowser: ({ rules }: { rules: Array<{ id: string }> }) => (
    <div>{rules.length} rendered rules</div>
  ),
  RulesBrowserSkeleton: () => <div>Loading rules</div>
}))

jest.mock('@/components/navigation/quick-nav/category-quick-nav', () => ({
  CategoryQuickNav: ({ categories }: { categories: Array<{ slug: string }> }) => (
    <div>{categories.length} categories</div>
  )
}))

jest.mock('@/components/checklists/actions/checklist-action-bar', () => ({
  ChecklistActionBar: ({ ruleIds }: { ruleIds: string[] }) => (
    <div data-testid="action-bar">{ruleIds.join(',')}</div>
  )
}))

jest.mock('@/lib/seo', () => ({
  categoryConfig: {
    html: { title: 'HTML' },
    images: { title: 'Images' }
  },
  pageMetadata: { rules: { title: 'Rules' } },
  siteConfig: { url: 'https://frontendchecklist.io' }
}))

const RulesPage = require('../page').default as typeof import('../page').default

describe('RulesPage', () => {
  it('renders the shared hero and action bar for the rules index', async () => {
    const view = await RulesPage({ params: Promise.resolve({ lang: 'en' }) })

    render(view)

    expect(screen.getByRole('heading', { level: 1, name: 'All Rules' })).toBeInTheDocument()
    expect(screen.getByText(/categories$/)).toBeInTheDocument()
    expect(screen.getByText(/rendered rules$/)).toBeInTheDocument()
    expect(screen.getByTestId('action-bar')).not.toBeEmptyDOMElement()
  })
})
