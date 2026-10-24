/**
 * @jest-environment node
 */

const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockFindFirstAccount = jest.fn()
const mockFetch = jest.fn()

jest.mock('server-only', () => ({}), { virtual: true })

jest.mock('@repo/auth/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      update: mockUpdate
    },
    account: {
      findFirst: mockFindFirstAccount
    }
  }
}))

const { getProfileForUser, syncGithubProfileForUser, updateProfileForUser } =
  require('../profile-service')

function createUser(overrides = {}) {
  return {
    username: null,
    githubUsername: 'TheDavidDias',
    headline: null,
    bio: null,
    githubUrl: null,
    xUrl: null,
    linkedinUrl: null,
    githubCompany: null,
    githubBlog: null,
    githubLocation: null,
    githubPublicRepos: null,
    githubPublicGists: null,
    githubFollowers: null,
    githubFollowing: null,
    githubCreatedAt: null,
    githubUpdatedAt: null,
    githubProfileImportedAt: new Date('2026-05-29T19:00:00.000Z'),
    isProfilePublic: false,
    showProgress: true,
    showChecklists: true,
    ...overrides
  }
}

describe('getProfileForUser', () => {
  const originalFetch = global.fetch

  beforeAll(() => {
    global.fetch = mockFetch
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockFindFirstAccount.mockResolvedValue(null)
    mockFetch.mockRejectedValue(new Error('Unexpected GitHub fetch'))
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('backfills username from GitHub and makes the profile public', async () => {
    const user = createUser()
    mockFindUnique.mockImplementation(({ where }) => (where.id ? user : null))
    mockUpdate.mockResolvedValue({})

    const profile = await getProfileForUser('user-1')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { username: 'thedaviddias', isProfilePublic: true }
    })
    expect(profile).toMatchObject({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      githubUrl: 'https://github.com/TheDavidDias',
      isProfilePublic: true
    })
  })

  it('recovers a missing GitHub username from the linked OAuth account', async () => {
    const user = createUser({
      githubUsername: null,
      githubProfileImportedAt: null
    })
    mockFindUnique.mockImplementation(({ where }) => (where.id ? user : null))
    mockFindFirstAccount.mockResolvedValue({ accessToken: 'github-token' })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'TheDavidDias',
        bio: 'Frontend engineer'
      })
    })
    mockUpdate.mockResolvedValue({})

    const profile = await getProfileForUser('user-1')

    expect(mockFindFirstAccount).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        providerId: 'github',
        accessToken: { not: null }
      },
      select: { accessToken: true }
    })
    expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer github-token',
        'User-Agent': 'Front-End-Checklist',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'user-1' },
      data: expect.objectContaining({
        githubUsername: 'TheDavidDias',
        githubUrl: 'https://github.com/TheDavidDias',
        bio: 'Frontend engineer'
      }),
      select: { id: true }
    })
    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-1' },
      data: { username: 'thedaviddias', isProfilePublic: true }
    })
    expect(profile).toMatchObject({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      githubUrl: 'https://github.com/TheDavidDias',
      isProfilePublic: true
    })
  })

  it('does not overwrite an existing username', async () => {
    const user = createUser({ username: 'custom-name', isProfilePublic: true })
    mockFindUnique.mockResolvedValue(user)

    const profile = await getProfileForUser('user-1')

    expect(mockFindUnique).toHaveBeenCalledTimes(1)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(profile).toMatchObject({
      username: 'custom-name',
      isProfilePublic: true
    })
  })

  it('preserves private visibility when no username backfill is needed', async () => {
    const user = createUser({ username: 'custom-name', isProfilePublic: false })
    mockFindUnique.mockResolvedValue(user)

    const profile = await getProfileForUser('user-1')

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(profile).toMatchObject({
      username: 'custom-name',
      isProfilePublic: false
    })
  })

  it('handles a taken GitHub-derived username without throwing', async () => {
    const user = createUser()
    mockFindUnique.mockImplementation(({ where }) => (where.id ? user : { id: 'other-user' }))

    const profile = await getProfileForUser('user-1')

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(profile).toMatchObject({
      username: undefined,
      isProfilePublic: false
    })
  })

  it('keeps the profile public when a username backfill races a unique constraint', async () => {
    const user = createUser()
    mockFindUnique.mockImplementation(({ where }) => (where.id ? user : null))
    mockUpdate.mockRejectedValueOnce({ code: 'P2002' }).mockResolvedValueOnce({})

    const profile = await getProfileForUser('user-1')

    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'user-1' },
      data: { username: 'thedaviddias', isProfilePublic: true }
    })
    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-1' },
      data: { isProfilePublic: true }
    })
    expect(profile).toMatchObject({
      username: undefined,
      isProfilePublic: true
    })
  })

  it('backfills empty editable fields from GitHub public profile data once', async () => {
    const importedAt = '2026-05-28T10:30:00Z'
    const user = createUser({
      username: 'thedaviddias',
      githubProfileImportedAt: null,
      isProfilePublic: true
    })
    mockFindUnique.mockResolvedValue(user)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'TheDavidDias',
        bio: 'Frontend engineer',
        twitter_username: 'thedaviddias',
        company: 'Front-End Checklist',
        blog: 'https://frontendchecklist.io',
        location: 'Montreal',
        public_repos: 42,
        public_gists: 7,
        followers: 1000,
        following: 125,
        created_at: '2012-04-18T12:00:00Z',
        updated_at: importedAt
      })
    })
    mockUpdate.mockResolvedValue({})

    const profile = await getProfileForUser('user-1')

    expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/users/thedaviddias', {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Front-End-Checklist',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        githubUsername: 'TheDavidDias',
        githubUrl: 'https://github.com/TheDavidDias',
        bio: 'Frontend engineer',
        xUrl: 'https://x.com/thedaviddias',
        githubCompany: 'Front-End Checklist',
        githubPublicRepos: 42,
        githubPublicGists: 7,
        githubFollowers: 1000,
        githubFollowing: 125,
        githubCreatedAt: new Date('2012-04-18T12:00:00Z'),
        githubUpdatedAt: new Date(importedAt)
      }),
      select: { id: true }
    })
    expect(profile).toMatchObject({
      bio: 'Frontend engineer',
      githubUrl: 'https://github.com/TheDavidDias',
      xUrl: 'https://x.com/thedaviddias'
    })
    expect(profile.githubProfileImportedAt).toEqual(expect.any(String))
  })

  it('preserves user-edited profile fields during GitHub import', async () => {
    const user = createUser({
      username: 'thedaviddias',
      bio: 'Local bio',
      githubUrl: 'https://github.com/local',
      xUrl: 'https://x.com/local',
      githubProfileImportedAt: null,
      isProfilePublic: true
    })
    mockFindUnique.mockResolvedValue(user)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'TheDavidDias',
        bio: 'GitHub bio',
        twitter_username: 'github',
        company: 'Front-End Checklist'
      })
    })
    mockUpdate.mockResolvedValue({})

    const profile = await getProfileForUser('user-1')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.not.objectContaining({
        bio: 'GitHub bio',
        githubUrl: 'https://github.com/TheDavidDias',
        xUrl: 'https://x.com/github'
      }),
      select: { id: true }
    })
    expect(profile).toMatchObject({
      bio: 'Local bio',
      githubUrl: 'https://github.com/local',
      xUrl: 'https://x.com/local'
    })
  })

  it('does not block profile loading when the GitHub import fails', async () => {
    const user = createUser({
      username: 'thedaviddias',
      githubProfileImportedAt: null,
      isProfilePublic: true
    })
    mockFindUnique.mockResolvedValue(user)
    mockFetch.mockRejectedValue(new Error('GitHub unavailable'))

    const profile = await getProfileForUser('user-1')

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(profile).toMatchObject({
      username: 'thedaviddias',
      githubProfileImportedAt: undefined
    })
  })
})

describe('updateProfileForUser', () => {
  const originalFetch = global.fetch

  beforeAll(() => {
    global.fetch = mockFetch
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockFindUnique.mockResolvedValue(null)
    mockFindFirstAccount.mockResolvedValue(null)
    mockFetch.mockRejectedValue(new Error('Unexpected GitHub fetch'))
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('returns a public URL after saving a public profile with a missing GitHub username', async () => {
    const user = createUser({
      githubUsername: null,
      githubProfileImportedAt: null,
      isProfilePublic: true
    })
    mockUpdate.mockResolvedValueOnce(user).mockResolvedValue({})
    mockFindFirstAccount.mockResolvedValue({ accessToken: 'github-token' })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'TheDavidDias'
      })
    })

    const profile = await updateProfileForUser('user-1', { isProfilePublic: true })

    expect(mockUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { isProfilePublic: true }
      })
    )
    expect(mockUpdate).toHaveBeenNthCalledWith(3, {
      where: { id: 'user-1' },
      data: { username: 'thedaviddias' }
    })
    expect(profile).toMatchObject({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      isProfilePublic: true
    })
  })
})

describe('syncGithubProfileForUser', () => {
  const originalFetch = global.fetch

  beforeAll(() => {
    global.fetch = mockFetch
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockFindFirstAccount.mockResolvedValue(null)
    mockFetch.mockRejectedValue(new Error('Unexpected GitHub fetch'))
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('refreshes GitHub-owned metadata and backfills the public username', async () => {
    const importedAt = '2026-05-28T10:30:00Z'
    const user = createUser({
      username: null,
      githubUsername: null,
      githubProfileImportedAt: null,
      isProfilePublic: true
    })
    mockFindUnique.mockImplementation(({ where }) => (where.id ? user : null))
    mockFindFirstAccount.mockResolvedValue({ accessToken: 'github-token' })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'TheDavidDias',
        company: 'Front-End Checklist',
        blog: 'https://frontendchecklist.io',
        location: 'Montreal',
        public_repos: 42,
        public_gists: 7,
        followers: 1000,
        following: 125,
        created_at: '2012-04-18T12:00:00Z',
        updated_at: importedAt
      })
    })
    mockUpdate.mockResolvedValue({})

    const profile = await syncGithubProfileForUser('user-1')

    expect(mockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'user-1' },
      data: expect.objectContaining({
        githubUsername: 'TheDavidDias',
        githubUrl: 'https://github.com/TheDavidDias',
        githubCompany: 'Front-End Checklist',
        githubBlog: 'https://frontendchecklist.io',
        githubLocation: 'Montreal',
        githubPublicRepos: 42,
        githubPublicGists: 7,
        githubFollowers: 1000,
        githubFollowing: 125,
        githubCreatedAt: new Date('2012-04-18T12:00:00Z'),
        githubUpdatedAt: new Date(importedAt)
      }),
      select: { id: true }
    })
    expect(mockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-1' },
      data: { username: 'thedaviddias' }
    })
    expect(profile).toMatchObject({
      username: 'thedaviddias',
      githubUsername: 'TheDavidDias',
      githubUrl: 'https://github.com/TheDavidDias',
      githubCompany: 'Front-End Checklist',
      githubPublicRepos: 42,
      githubFollowers: 1000
    })
  })

  it('preserves local editable fields during manual sync', async () => {
    const user = createUser({
      username: 'thedaviddias',
      bio: 'Local bio',
      xUrl: 'https://x.com/local',
      linkedinUrl: 'https://www.linkedin.com/in/local',
      githubProfileImportedAt: new Date('2026-05-01T10:30:00Z'),
      isProfilePublic: true
    })
    mockFindUnique.mockResolvedValue(user)
    mockFindFirstAccount.mockResolvedValue({ accessToken: 'github-token' })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        login: 'TheDavidDias',
        bio: 'GitHub bio',
        twitter_username: 'github',
        followers: 1001,
        public_repos: 43
      })
    })
    mockUpdate.mockResolvedValue({})

    const profile = await syncGithubProfileForUser('user-1')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.not.objectContaining({
        bio: 'GitHub bio',
        xUrl: 'https://x.com/github',
        linkedinUrl: expect.any(String)
      }),
      select: { id: true }
    })
    expect(profile).toMatchObject({
      bio: 'Local bio',
      xUrl: 'https://x.com/local',
      linkedinUrl: 'https://www.linkedin.com/in/local',
      githubFollowers: 1001,
      githubPublicRepos: 43
    })
  })
})
