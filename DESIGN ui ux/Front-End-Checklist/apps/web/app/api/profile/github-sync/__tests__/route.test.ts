/**
 * @jest-environment node
 */

const mockGetSession = jest.fn()
const mockSyncGithubProfileForUser = jest.fn()
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

jest.mock('@/lib/server/github-profile-fetch', () => {
  class GithubProfileSyncError extends Error {
    code: string

    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }

  return {
    GithubProfileSyncError
  }
})

jest.mock('@/lib/server/profile-service', () => ({
  syncGithubProfileForUser: mockSyncGithubProfileForUser
}))

jest.mock('@/lib/telemetry-server', () => ({
  captureServerException: mockCaptureServerException,
  trackServerEvent: mockTrackServerEvent
}))

const { headers } = require('next/headers')
const { GithubProfileSyncError } = require('@/lib/server/github-profile-fetch')
const { POST } = require('../route')

describe('profile GitHub sync route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    headers.mockResolvedValue(new Headers())
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('syncs the signed-in user GitHub profile', async () => {
    mockSyncGithubProfileForUser.mockResolvedValue({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      githubUrl: 'https://github.com/TheDavidDias',
      githubFollowers: 1000,
      githubPublicRepos: 42,
      isProfilePublic: true,
      showProgress: true,
      showChecklists: true
    })

    const response = await POST()

    expect(mockSyncGithubProfileForUser).toHaveBeenCalledWith('user-1')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      profile: {
        username: 'thedaviddias',
        githubFollowers: 1000,
        githubPublicRepos: 42
      },
      syncedAt: expect.any(String)
    })
  })

  it('returns a user-safe error when GitHub cannot sync', async () => {
    mockSyncGithubProfileForUser.mockRejectedValue(
      new GithubProfileSyncError(
        'missing_github_token',
        'Sign in with GitHub again before syncing.'
      )
    )

    const response = await POST()

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: 'missing_github_token',
      error: 'Sign in with GitHub again before syncing.'
    })
  })
})
