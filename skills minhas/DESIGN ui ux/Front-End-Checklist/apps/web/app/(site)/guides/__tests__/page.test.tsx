import { render, screen } from '@/test-utils'

jest.mock('content-collections', () => ({
  allGuides: [
    {
      id: 'guide-1',
      slug: 'core-web-vitals-audit-workflow',
      title: 'How to run a practical Core Web Vitals audit before launch',
      description: 'Description',
      type: 'how-to',
      category: 'performance',
      tags: ['core web vitals'],
      updatedAt: '2026-03-13',
      coverImage: '/guides/cover-core-web-vitals.svg',
      featured: true,
      language: 'en',
      author: { name: 'David Dias' }
    },
    {
      id: 'guide-2',
      slug: 'why-opinionated-checklists-still-beat-generic-best-practices',
      title: 'Why opinionated checklists still beat generic best-practice lists',
      description: 'Description',
      type: 'insight',
      category: 'general',
      tags: ['quality'],
      updatedAt: '2026-03-13',
      coverImage: '/guides/cover-opinionated-checklists.svg',
      featured: false,
      language: 'en',
      author: { name: 'David Dias' }
    }
  ]
}))

jest.mock('@/components/guides/guide-card', () => ({
  GuideCard: ({ guide }: { guide: { title: string } }) => <div>{guide.title}</div>
}))

jest.mock('@/components/guides/guide-filters', () => ({
  GuideFilters: ({ categories }: { categories: string[] }) => <div>{categories.length} filters</div>
}))

jest.mock('@/lib/seo', () => ({
  pageMetadata: { guides: { title: 'Guides' } },
  siteConfig: { url: 'https://frontendchecklist.io' }
}))

const { GuidesPageContent } = require('../page') as typeof import('../page')

describe('GuidesPage', () => {
  it('renders featured and latest guides', async () => {
    const view = await GuidesPageContent({
      searchParamsPromise: Promise.resolve({})
    })

    render(view)

    expect(await screen.findByRole('heading', { level: 1, name: 'Guides' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Featured' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Latest' })).toBeInTheDocument()
    expect(await screen.findByText(/filters$/)).toBeInTheDocument()
    expect(await screen.findByText(/Core Web Vitals audit/i)).toBeInTheDocument()
  })
})
