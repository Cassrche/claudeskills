import { PageHero } from '@/components/content/page/page-hero'
import { render, screen } from '@/test-utils'

describe('PageHero', () => {
  it('renders a title and description with shared defaults', () => {
    render(<PageHero title="All Rules" description="Browse every frontend rule." />)

    expect(screen.getByRole('heading', { level: 1, name: 'All Rules' })).toBeInTheDocument()
    expect(screen.getByText('Browse every frontend rule.')).toBeInTheDocument()
  })

  it('renders optional eyebrow and actions', () => {
    render(
      <PageHero
        title="MCP Server"
        eyebrow={<span>AI Integration</span>}
        actions={<button type="button">Share</button>}
      />
    )

    expect(screen.getByText('AI Integration')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })

  it('renders extra child content below the lead copy', () => {
    render(
      <PageHero title="Checklists" description="Curated rule sets.">
        <div>Quick navigation</div>
      </PageHero>
    )

    expect(screen.getByText('Quick navigation')).toBeInTheDocument()
  })
})
