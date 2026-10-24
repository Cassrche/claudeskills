/**
 * @jest-environment node
 */

const mockGetSession = jest.fn()
const mockGetProfileForUser = jest.fn()

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
  updateProfileForUser: jest.fn()
}))

const { headers } = require('next/headers')
const { GET } = require('../route')

describe('profile GET route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    headers.mockResolvedValue(new Headers())
  })

  it('returns the generated public profile username and visibility', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockGetProfileForUser.mockResolvedValue({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      githubUrl: 'https://github.com/TheDavidDias',
      isProfilePublic: true,
      showProgress: true,
      showChecklists: true
    })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      isProfilePublic: true
    })
  })
})
