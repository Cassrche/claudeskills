/**
 * @jest-environment node
 */

const mockGetSession = jest.fn()
const mockGetProfileForUser = jest.fn()
const mockUpdateProfileForUser = jest.fn()
const mockTrackServerEvent = jest.fn()
const mockCaptureServerException = jest.fn()

jest.mock('@repo/auth/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession
    }
  }
}))

jest.mock('next/headers', () => ({
  headers: jest.fn()
}))

jest.mock('@/lib/server/profile-service', () => ({
  getProfileForUser: mockGetProfileForUser,
  updateProfileForUser: mockUpdateProfileForUser
}))

jest.mock('@/lib/telemetry-server', () => ({
  captureServerException: mockCaptureServerException,
  trackServerEvent: mockTrackServerEvent
}))

const { headers } = require('next/headers')
const { PATCH } = require('../route')

describe('profile route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    headers.mockResolvedValue(new Headers())
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('normalizes username-first social links before updating the profile', async () => {
    mockUpdateProfileForUser.mockResolvedValue({
      githubUrl: 'https://github.com/thedaviddias',
      xUrl: 'https://x.com/thedaviddias',
      linkedinUrl: 'https://www.linkedin.com/in/thedaviddias'
    })

    const response = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          githubUrl: 'thedaviddias',
          xUrl: '@thedaviddias',
          linkedinUrl: '/in/thedaviddias'
        })
      })
    )

    expect(mockUpdateProfileForUser).toHaveBeenCalledWith('user-1', {
      githubUrl: 'https://github.com/thedaviddias',
      xUrl: 'https://x.com/thedaviddias',
      linkedinUrl: 'https://www.linkedin.com/in/thedaviddias'
    })
    expect(response.status).toBe(200)
  })

  it('rejects unsupported social profile domains', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          githubUrl: 'https://example.com/thedaviddias'
        })
      })
    )

    expect(mockUpdateProfileForUser).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid GitHub profile' })
  })

  it('does not accept GitHub-owned metadata in profile updates', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          githubFollowers: 1_000_000,
          githubPublicRepos: 500
        })
      })
    )

    expect(mockUpdateProfileForUser).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'No valid fields to update' })
  })
})
