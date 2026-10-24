import { render, screen } from '@testing-library/react'
import { ProfileUrlSection } from './profile-url-section'

describe('ProfileUrlSection', () => {
  it('renders a clickable public profile URL when the profile is public', () => {
    render(<ProfileUrlSection resolvedUsername="thedaviddias" isProfilePublic />)

    const link = screen.getByRole('link', {
      name: 'https://frontendchecklist.io/u/thedaviddias'
    })
    expect(link).toHaveAttribute('href', '/u/thedaviddias')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders inactive URL text when the profile is private', () => {
    render(<ProfileUrlSection resolvedUsername="thedaviddias" isProfilePublic={false} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Make your profile public to enable this URL.')).toBeInTheDocument()
  })
})
