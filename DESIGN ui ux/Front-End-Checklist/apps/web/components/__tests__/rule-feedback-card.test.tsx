import { fireEvent, render, screen } from '@testing-library/react'

const mockUseSession = jest.fn()
const mockSignInSocial = jest.fn()

jest.mock('@repo/auth/auth-client', () => ({
  authClient: {
    useSession: mockUseSession,
    signIn: {
      social: mockSignInSocial
    }
  }
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/rules/html/example-rule')
}))

jest.mock('@/hooks/use-rule-feedback', () => ({
  useRuleFeedback: jest.fn()
}))

const { RuleFeedbackCard } =
  require('@/components/rules/detail/rule-feedback-card') as typeof import('@/components/rules/detail/rule-feedback-card')
const { useRuleFeedback } =
  require('@/hooks/use-rule-feedback') as typeof import('@/hooks/use-rule-feedback')

describe('RuleFeedbackCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a sign-in prompt for guests', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    ;(useRuleFeedback as jest.Mock).mockReturnValue({
      currentUserFeedback: null,
      isLoading: false,
      isSaving: false,
      setFeedback: jest.fn()
    })

    render(<RuleFeedbackCard ruleId="rule-1" />)

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Helpful' })).not.toBeInTheDocument()
  })

  it('renders feedback buttons for signed-in users and submits selection', () => {
    const setFeedback = jest.fn()
    mockUseSession.mockReturnValue({ data: { user: { id: 'user-1' } }, isPending: false })
    ;(useRuleFeedback as jest.Mock).mockReturnValue({
      currentUserFeedback: 'helpful',
      isLoading: false,
      isSaving: false,
      setFeedback
    })

    render(<RuleFeedbackCard ruleId="rule-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Not helpful' }))

    expect(screen.getByRole('button', { name: 'Helpful' })).toHaveAttribute('aria-pressed', 'true')
    expect(setFeedback).toHaveBeenCalledWith('not_helpful')
  })
})
