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
      publishedAt: '2026-03-13',
      updatedAt: '2026-03-13',
      coverImage: '/guides/cover-core-web-vitals.svg',
      featured: true,
      language: 'en',
      relatedRules: ['performance/largest-contentful-paint'],
      relatedChecklists: ['core-web-vitals'],
      relatedGuides: ['why-opinionated-checklists-still-beat-generic-best-practices'],
      author: { name: 'David Dias' },
      mdx: 'compiled'
    },
    {
      id: 'guide-2',
      slug: 'why-opinionated-checklists-still-beat-generic-best-practices',
      title: 'Why opinionated checklists still beat generic best-practice lists',
      description: 'Description',
      type: 'insight',
      category: 'general',
      tags: ['quality'],
      publishedAt: '2026-03-13',
      updatedAt: '2026-03-13',
      coverImage: '/guides/cover-opinionated-checklists.svg',
      featured: false,
      language: 'en',
      relatedRules: ['seo/quality'],
      relatedChecklists: ['comprehensive-audit'],
      relatedGuides: ['core-web-vitals-audit-workflow'],
      author: { name: 'David Dias' },
      mdx: 'compiled'
    }
  ],
  allRules: [
    {
      title: 'Largest Contentful Paint',
      description: 'Rule description',
      primaryCategory: 'performance',
      slug: 'largest-contentful-paint',
      language: 'en'
    }
  ],
  allChecklists: [
    {
      title: 'Core Web Vitals',
      description: 'Checklist description',
      slug: 'core-web-vitals',
      language: 'en'
    }
  ]
}))

jest.mock('@content-collections/mdx/react', () => ({
  MDXContent: () => <div data-testid="mdx-content">Guide body</div>
}))

jest.mock('@/components/guides/guide-detail-sections', () => ({
  GuideHeader: ({ guide }: { guide: { title: string } }) => <h1>{guide.title}</h1>,
  GuideSidebar: () => <div data-testid="guide-sidebar">Sidebar</div>,
  GuideRelatedSection: ({
    heading,
    items
  }: {
    heading: string
    items: Array<{ title: string }>
  }) => (
    <section>
      <h2>{heading}</h2>
      <div>{items.map(item => item.title).join(',')}</div>
    </section>
  ),
  buildGuideRuleLink: (rule: { title: string; primaryCategory: string; slug: string }) => ({
    title: rule.title,
    href: `/rules/${rule.primaryCategory}/${rule.slug}`,
    meta: 'Rule'
  }),
  buildGuideChecklistLink: (checklist: { title: string; slug: string }) => ({
    title: checklist.title,
    href: `/checklists/${checklist.slug}`,
    meta: 'Checklist'
  }),
  buildGuideGuideLink: (guide: { title: string; slug: string; type: string }) => ({
    title: guide.title,
    href: `/guides/${guide.slug}`,
    meta: guide.type
  })
}))

jest.mock('@/components/rules/detail/mdx-components', () => ({
  mdxComponents: {}
}))

jest.mock('@/lib/seo', () => ({
  generateGuideMetadata: () => ({ title: 'Guide title' }),
  generateGuideSchema: () => ({ '@type': 'Article' }),
  JsonLd: () => <script type="application/ld+json" />,
  siteConfig: { url: 'https://frontendchecklist.io' }
}))

const GuideDetailPage = require('../page').default as typeof import('../page').default

describe('GuideDetailPage', () => {
  it('renders guide content and related sections', async () => {
    const view = await GuideDetailPage({
      params: Promise.resolve({ slug: 'core-web-vitals-audit-workflow' })
    })

    render(view)

    expect(
      screen.getByRole('heading', { level: 1, name: /core web vitals audit/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('mdx-content')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Related Rules' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Related Checklists' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Related Guides' })).toBeInTheDocument()
    expect(screen.getByTestId('guide-sidebar')).toBeInTheDocument()
  })
})
