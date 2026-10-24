import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const mockUseSession = jest.fn()
const mockSignOutCurrentUser = jest.fn()
const mockStartGitHubSignIn = jest.fn()

jest.mock('@repo/auth/auth-client', () => ({
  authClient: {
    useSession: mockUseSession
  }
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/rules')
}))

jest.mock('@repo/design-system/ui/dropdown-menu', () => {
  return {
    DropdownMenu: ({
      children,
      onOpenChange
    }: {
      children: ReactNode
      onOpenChange?: (open: boolean) => void
    }) => (
      <div data-testid="dropdown-menu" onClick={() => onOpenChange?.(true)}>
        {children}
      </div>
    ),
    DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>
  }
})

jest.mock('@/lib/auth-actions', () => ({
  signOutCurrentUser: mockSignOutCurrentUser,
  startGitHubSignIn: mockStartGitHubSignIn
}))

const AuthButtonModule: typeof import('./auth-button') = require('./auth-button')
const { AuthButton } = AuthButtonModule

const originalFetch = global.fetch

/**
 * Set the signed-in session returned by the mocked auth client.
 */
function mockSignedInSession() {
  mockUseSession.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        name: 'David Dias',
        email: 'code@thedaviddias.com',
        image: null
      }
    },
    isPending: false
  })
}

/**
 * Mock the profile API response used by the account menu shortcut.
 * @param profile - Partial profile response returned by `/api/profile`.
 */
function mockProfileResponse(profile: object) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => profile
  })
}

/**
 * Open the Radix account dropdown in the jsdom test environment.
 */
function openAccountMenu() {
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Account menu' }), {
    button: 0,
    ctrlKey: false
  })
}

describe('AuthButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignOutCurrentUser.mockResolvedValue({ error: null })
    mockStartGitHubSignIn.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('shows a public profile shortcut in the desktop account menu for public profiles', async () => {
    mockSignedInSession()
    mockProfileResponse({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      isProfilePublic: true
    })

    render(<AuthButton />)
    openAccountMenu()

    const link = await screen.findByRole('link', { name: 'View public profile' })
    expect(link).toHaveAttribute('href', '/u/thedaviddias')
  })

  it('hides the desktop public profile shortcut when the profile is private', async () => {
    mockSignedInSession()
    mockProfileResponse({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      isProfilePublic: false
    })

    render(<AuthButton />)
    openAccountMenu()

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/profile'))
    expect(screen.queryByRole('link', { name: 'View public profile' })).not.toBeInTheDocument()
  })

  it('hides the desktop public profile shortcut when no username can be resolved', async () => {
    mockSignedInSession()
    mockProfileResponse({ isProfilePublic: true })

    render(<AuthButton />)
    openAccountMenu()

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/profile'))
    expect(screen.queryByRole('link', { name: 'View public profile' })).not.toBeInTheDocument()
  })

  it('shows the public profile shortcut in the mobile account menu for public profiles', async () => {
    mockSignedInSession()
    mockProfileResponse({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      isProfilePublic: true
    })

    render(<AuthButton mobile />)

    const link = await screen.findByRole('link', { name: 'View public profile' })
    expect(link).toHaveAttribute('href', '/u/thedaviddias')
  })
})
