import { render, screen } from '@testing-library/react'

const { AIPrompts } =
  require('@/components/rules/detail/ai-prompts') as typeof import('@/components/rules/detail/ai-prompts')

describe('AIPrompts', () => {
  it('renders only prompts with content', () => {
    render(
      <AIPrompts
        prompts={{
          check: 'Verify that the page returns a 404 status.',
          fix: 'Create a real 404 page.',
          explain: '',
          codeReview: undefined
        }}
      />
    )

    expect(screen.getByText('Check')).toBeInTheDocument()
    expect(screen.getByText('Fix')).toBeInTheDocument()
    expect(screen.queryByText('Explain')).not.toBeInTheDocument()
    expect(screen.queryByText('Review')).not.toBeInTheDocument()
  })

  it('shows a copy action for each rendered prompt', () => {
    render(
      <AIPrompts
        prompts={{
          check: 'Verify the 404 response.',
          fix: 'Build the missing page.'
        }}
      />
    )

    const copyButtons = screen.getAllByRole('button', { name: /copy .* prompt/i })

    expect(copyButtons).toHaveLength(2)
  })
})
