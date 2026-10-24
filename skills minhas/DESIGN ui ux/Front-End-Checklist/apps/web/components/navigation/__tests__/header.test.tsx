import { fireEvent, render, screen } from '@testing-library/react'
import { Header } from '@/components/navigation/header'
import { useScrollDirection } from '@/hooks/use-scroll-direction'

jest.mock('@/hooks/use-scroll-direction')
jest.mock('@/components/auth/auth-button', () => ({
  AuthButton: () => <button type="button">Sign in</button>
}))
jest.mock('@/components/links/github-link', () => ({
  GitHubLink: () => <a href="https://github.com">GitHub</a>
}))
jest.mock('@/components/links/x-link', () => ({
  XLink: () => <a href="https://x.com">X</a>
}))
jest.mock('@/lib/telemetry-interactions', () => ({
  trackInteraction: jest.fn()
}))

const mockUseScrollDirection = useScrollDirection as jest.MockedFunction<typeof useScrollDirection>
const { trackInteraction } = require('@/lib/telemetry-interactions')

const defaultProps = {
  onOpenSearch: jest.fn(),
  githubStars: 1000
}

beforeEach(() => {
  defaultProps.onOpenSearch.mockClear()
  mockUseScrollDirection.mockReturnValue('up')
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Header', () => {
  it('renders visible on initial mount (no -translate-y-full)', () => {
    const { container } = render(<Header {...defaultProps} />)
    const header = container.querySelector('header')

    expect(header).not.toHaveClass('-translate-y-full')
  })

  it('hides when scroll direction is "down"', () => {
    mockUseScrollDirection.mockReturnValue('down')

    const { container } = render(<Header {...defaultProps} />)
    const header = container.querySelector('header')

    expect(header).toHaveClass('-translate-y-full')
  })

  it('shows when scroll direction is "up"', () => {
    mockUseScrollDirection.mockReturnValue('up')

    const { container } = render(<Header {...defaultProps} />)
    const header = container.querySelector('header')

    expect(header).not.toHaveClass('-translate-y-full')
  })

  it('stays visible when mobile menu is open even if scroll direction is "down"', () => {
    mockUseScrollDirection.mockReturnValue('down')

    const { container } = render(<Header {...defaultProps} />)
    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(menuButton)

    const header = container.querySelector('header')
    expect(header).not.toHaveClass('-translate-y-full')
  })

  it('renders main navigation links', () => {
    render(<Header {...defaultProps} />)

    expect(screen.getByRole('link', { name: 'Rules' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Checklists' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Guides' })).toBeInTheDocument()
  })

  it('calls onOpenSearch when search button is clicked', () => {
    render(<Header {...defaultProps} />)

    const searchButtons = screen.getAllByRole('button', { name: /search/i })
    fireEvent.click(searchButtons[0])

    expect(defaultProps.onOpenSearch).toHaveBeenCalledTimes(1)
    expect(trackInteraction).toHaveBeenCalledWith('search_opened', {
      label: 'desktop_search',
      location: 'header'
    })
  })

  it('closes mobile menu on Escape key', () => {
    mockUseScrollDirection.mockReturnValue('down')
    const { container } = render(<Header {...defaultProps} />)

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(menuButton)

    const header = container.querySelector('header')
    expect(header).not.toHaveClass('-translate-y-full')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(header).toHaveClass('-translate-y-full')
  })
})
