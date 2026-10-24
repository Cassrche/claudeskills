import { render, screen } from '@/test-utils'

jest.mock('@/components/rules/detail/share-button', () => ({
  ShareButton: ({ title }: { title: string }) => <button type="button">{title}</button>
}))

jest.mock('@/components/rules/browser/rules-browser', () => ({
  RulesBrowser: ({ currentCategory }: { currentCategory?: string }) => (
    <div>{currentCategory} browser</div>
  ),
  RulesBrowserSkeleton: () => <div>Loading rules</div>
}))

jest.mock('@/components/checklists/actions/checklist-action-bar', () => ({
  ChecklistActionBar: ({
    ruleIds,
    currentCategory
  }: {
    ruleIds: string[]
    currentCategory?: string
  }) => <div data-testid="action-bar">{`${currentCategory}:${ruleIds.join(',')}`}</div>
}))

jest.mock('@/lib/seo', () => ({
  categoryConfig: {
    html: {
      title: 'HTML',
      description: 'Markup rules',
      seoDescription: 'Markup rules'
    }
  },
  generateCategoryMetadata: jest.fn(),
  generateCategorySchema: jest.fn(() => ({})),
  JsonLd: () => null,
  siteConfig: { url: 'https://frontendchecklist.io' }
}))

const CategoryPage = require('../page').default as typeof import('../page').default

describe('CategoryPage', () => {
  it('renders the shared hero and scoped action bar for a category page', async () => {
    const view = await CategoryPage({
      params: Promise.resolve({ lang: 'en', category: 'html' })
    })

    render(view)

    expect(screen.getByRole('heading', { level: 1, name: 'HTML' })).toBeInTheDocument()
    expect(screen.getByText('Markup rules')).toBeInTheDocument()
    expect(screen.getByText('html browser')).toBeInTheDocument()
    expect(screen.getByTestId('action-bar')).toHaveTextContent(/^html:/)
  })
})
