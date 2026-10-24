import {
  getSocialProfileInputValue,
  isValidSocialProfileInput,
  normalizeOptionalSocialProfileUrl
} from '@/lib/social-links'

describe('social link normalization', () => {
  it('normalizes GitHub usernames and URLs', () => {
    expect(normalizeOptionalSocialProfileUrl('github', 'thedaviddias')).toBe(
      'https://github.com/thedaviddias'
    )
    expect(normalizeOptionalSocialProfileUrl('github', '@thedaviddias')).toBe(
      'https://github.com/thedaviddias'
    )
    expect(normalizeOptionalSocialProfileUrl('github', 'https://github.com/thedaviddias/')).toBe(
      'https://github.com/thedaviddias'
    )
  })

  it('normalizes X handles and URLs', () => {
    expect(normalizeOptionalSocialProfileUrl('x', 'thedaviddias')).toBe(
      'https://x.com/thedaviddias'
    )
    expect(normalizeOptionalSocialProfileUrl('x', '@thedaviddias')).toBe(
      'https://x.com/thedaviddias'
    )
    expect(normalizeOptionalSocialProfileUrl('x', 'https://x.com/thedaviddias/')).toBe(
      'https://x.com/thedaviddias'
    )
  })

  it('normalizes LinkedIn slugs and profile URLs', () => {
    expect(normalizeOptionalSocialProfileUrl('linkedin', 'thedaviddias')).toBe(
      'https://www.linkedin.com/in/thedaviddias'
    )
    expect(normalizeOptionalSocialProfileUrl('linkedin', '/in/thedaviddias')).toBe(
      'https://www.linkedin.com/in/thedaviddias'
    )
    expect(
      normalizeOptionalSocialProfileUrl('linkedin', 'https://linkedin.com/in/thedaviddias/')
    ).toBe('https://www.linkedin.com/in/thedaviddias')
  })

  it('preserves supported LinkedIn company URLs', () => {
    expect(
      normalizeOptionalSocialProfileUrl('linkedin', 'https://linkedin.com/company/acme/')
    ).toBe('https://www.linkedin.com/company/acme')
  })

  it('returns null for empty optional values', () => {
    expect(normalizeOptionalSocialProfileUrl('github', '')).toBeNull()
    expect(normalizeOptionalSocialProfileUrl('x', '   ')).toBeNull()
    expect(normalizeOptionalSocialProfileUrl('linkedin', null)).toBeNull()
  })

  it('rejects invalid or unsupported values', () => {
    expect(isValidSocialProfileInput('github', 'https://example.com/thedaviddias')).toBe(false)
    expect(isValidSocialProfileInput('x', 'handle-that-is-too-long')).toBe(false)
    expect(isValidSocialProfileInput('linkedin', 'https://example.com/in/thedaviddias')).toBe(false)
  })

  it('formats stored URLs back to shorthand profile form values', () => {
    expect(getSocialProfileInputValue('github', 'https://github.com/thedaviddias')).toBe(
      'thedaviddias'
    )
    expect(getSocialProfileInputValue('x', 'https://x.com/thedaviddias')).toBe('thedaviddias')
    expect(getSocialProfileInputValue('linkedin', 'https://www.linkedin.com/in/thedaviddias')).toBe(
      'thedaviddias'
    )
    expect(getSocialProfileInputValue('linkedin', 'https://www.linkedin.com/company/acme')).toBe(
      '/company/acme'
    )
  })
})
