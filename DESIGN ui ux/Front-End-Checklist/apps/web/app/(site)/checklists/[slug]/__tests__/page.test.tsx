import { render, screen } from '@/test-utils'

jest.mock('next/navigation', () => ({
  notFound: jest.fn()
}))

jest.mock('@/components/rules/browser/rules-browser', () => ({
  RulesBrowser: ({ rules }: { rules: Array<{ id: string }> }) => (
    <div>{rules.length} checklist rules</div>
  ),
  RulesBrowserSkeleton: () => <div>Loading rules</div>
}))

jest.mock('@/components/checklists/actions/checklist-action-bar', () => ({
  ChecklistActionBar: ({ ruleIds }: { ruleIds: string[] }) => (
    <div data-testid="action-bar">{ruleIds.join(',')}</div>
  )
}))

jest.mock('@/lib/seo', () => ({
  generateChecklistMetadata: jest.fn(),
  generateChecklistSchema: jest.fn(() => ({})),
  JsonLd: () => null,
  siteConfig: { url: 'https://frontendchecklist.io' }
}))

const ChecklistDetailPage = require('../page').default as typeof import('../page').default

describe('ChecklistDetailPage', () => {
  it('renders the shared hero metadata and scoped action bar', async () => {
    const view = await ChecklistDetailPage({
      params: Promise.resolve({ lang: 'en', slug: 'launch-checklist' })
    })

    render(view)

    expect(screen.getByRole('heading', { level: 1, name: 'Launch Checklist' })).toBeInTheDocument()
    expect(
      screen.getByText(/Essential checks to complete before deploying your website to production/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
    expect(screen.getByText('45 minutes')).toBeInTheDocument()
    expect(screen.getByText(/checklist rules$/)).toBeInTheDocument()
    expect(screen.getByTestId('action-bar')).not.toBeEmptyDOMElement()
  })
})
