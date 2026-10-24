import { fireEvent, render, screen } from '@testing-library/react'
import { ShareButton } from '@/components/rules/detail/share-button'

jest.mock('@/lib/telemetry-interactions', () => ({
  trackInteraction: jest.fn()
}))

const { trackInteraction } = require('@/lib/telemetry-interactions')

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tracks when the share menu trigger is clicked', () => {
    render(<ShareButton title="Rule title" url="https://frontendchecklist.io/rules/html/test" />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    expect(trackInteraction).toHaveBeenCalledWith('share_action_clicked', {
      label: 'open_share_menu',
      location: 'page_header',
      target: 'https://frontendchecklist.io/rules/html/test'
    })
  })
})
