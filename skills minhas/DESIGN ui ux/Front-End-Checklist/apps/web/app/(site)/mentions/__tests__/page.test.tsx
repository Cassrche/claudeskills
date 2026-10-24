import { render, screen } from '@/test-utils'

jest.mock('@/lib/mentions', () => ({
  getMentions: jest.fn(() => [{ id: 'mention-1' }])
}))

jest.mock('@/components/mentions/browser/mentions-browser', () => ({
  MentionsBrowser: ({ mentions }: { mentions: Array<{ id: string }> }) => (
    <div>{mentions.length} mentions</div>
  )
}))

jest.mock('@/lib/seo', () => ({
  pageMetadata: { mentions: { title: 'Mentions' } }
}))

const MentionsPage = require('../page').default as typeof import('../page').default

describe('MentionsPage', () => {
  it('renders the shared hero and mentions browser', async () => {
    const view = await MentionsPage({ params: Promise.resolve({ lang: 'en' }) })

    render(view)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Community Mentions' })
    ).toBeInTheDocument()
    expect(screen.getByText('1 mentions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Submit a Mention/i })).toBeInTheDocument()
  })
})
