import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CopyMarkdownDropdown } from '@/components/rules/detail/copy-markdown-dropdown'

jest.mock('@/lib/telemetry-interactions', () => ({
  trackInteraction: jest.fn()
}))

const { trackInteraction } = require('@/lib/telemetry-interactions')

describe('CopyMarkdownDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    })
  })

  it('tracks successful markdown copy actions', async () => {
    render(
      <CopyMarkdownDropdown
        content="## Code Example\n\nUse semantic HTML."
        filePath="en/html/semantic-html.mdx"
        title="Use semantic HTML"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy Markdown' }))

    await waitFor(() => {
      expect(trackInteraction).toHaveBeenCalledWith('copy_action_completed', {
        label: 'copy_markdown',
        location: 'rule_detail',
        target: 'en/html/semantic-html.mdx'
      })
    })
  })
})
