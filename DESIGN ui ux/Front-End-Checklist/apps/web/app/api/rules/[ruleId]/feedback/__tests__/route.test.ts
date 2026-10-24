/**
 * @jest-environment node
 */

const mockGetSession = jest.fn()
const mockQueryRaw = jest.fn()
const mockGroupBy = jest.fn()
const mockFindUnique = jest.fn()
const mockUpsert = jest.fn()
const prismaMock = {
  $queryRaw: mockQueryRaw,
  ruleFeedback: {
    groupBy: mockGroupBy,
    findUnique: mockFindUnique,
    upsert: mockUpsert
  }
}

jest.mock('@repo/auth/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession
    }
  }
}))

jest.mock('@repo/auth/prisma', () => ({
  prisma: prismaMock
}))

jest.mock('next/headers', () => ({
  headers: jest.fn()
}))

jest.mock('@/lib/bot-protection', () => ({
  rejectIfBot: jest.fn()
}))

const { headers } = require('next/headers') as typeof import('next/headers')
const { rejectIfBot } = require('@/lib/bot-protection') as typeof import('@/lib/bot-protection')
const { GET, PUT } = require('../route') as typeof import('../route')

describe('rule feedback route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.ruleFeedback = {
      groupBy: mockGroupBy,
      findUnique: mockFindUnique,
      upsert: mockUpsert
    }
    ;(headers as jest.Mock).mockResolvedValue(new Headers())
    ;(rejectIfBot as jest.Mock).mockResolvedValue(null)
    mockQueryRaw.mockResolvedValue([{ exists: true }])
  })

  it('returns a stable empty summary for guest GET requests', async () => {
    mockGetSession.mockResolvedValue(null)
    mockGroupBy.mockResolvedValue([])

    const response = await GET(new Request('http://localhost') as any, {
      params: Promise.resolve({ ruleId: 'rule-1' })
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      currentUserFeedback: null,
      summary: {
        totalResponses: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        helpfulRatio: 0
      },
      credibility: {
        publicEligible: false,
        reason: 'insufficient_volume'
      }
    })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns an empty response when the RuleFeedback table is unavailable', async () => {
    mockGetSession.mockResolvedValue(null)
    mockQueryRaw.mockResolvedValue([{ exists: false }])

    const response = await GET(new Request('http://localhost') as any, {
      params: Promise.resolve({ ruleId: 'rule-1' })
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      currentUserFeedback: null,
      summary: {
        totalResponses: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        helpfulRatio: 0
      },
      credibility: {
        publicEligible: false,
        reason: 'insufficient_volume'
      }
    })
    expect(mockGroupBy).not.toHaveBeenCalled()
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns an empty response when the Prisma ruleFeedback delegate is unavailable', async () => {
    mockGetSession.mockResolvedValue(null)
    prismaMock.ruleFeedback = undefined as any

    const response = await GET(new Request('http://localhost') as any, {
      params: Promise.resolve({ ruleId: 'rule-1' })
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      currentUserFeedback: null,
      summary: {
        totalResponses: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        helpfulRatio: 0
      },
      credibility: {
        publicEligible: false,
        reason: 'insufficient_volume'
      }
    })
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated PUT requests', async () => {
    mockGetSession.mockResolvedValue(null)

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ value: 'helpful' })
      }) as any,
      { params: Promise.resolve({ ruleId: 'rule-1' }) }
    )

    expect(response.status).toBe(401)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('upserts feedback by user and rule pair', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpsert.mockResolvedValue({
      id: 'feedback-1'
    })
    mockGroupBy.mockResolvedValue([{ value: 'helpful', _count: { value: 1 } }])
    mockFindUnique.mockResolvedValue({ value: 'helpful' })

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ value: 'helpful' })
      }) as any,
      { params: Promise.resolve({ ruleId: 'rule-1' }) }
    )

    expect(mockUpsert).toHaveBeenCalledWith({
      where: {
        userId_ruleId: {
          userId: 'user-1',
          ruleId: 'rule-1'
        }
      },
      update: {
        value: 'helpful'
      },
      create: {
        userId: 'user-1',
        ruleId: 'rule-1',
        value: 'helpful'
      }
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      currentUserFeedback: 'helpful',
      summary: {
        totalResponses: 1,
        helpfulCount: 1,
        notHelpfulCount: 0,
        helpfulRatio: 1
      },
      credibility: {
        publicEligible: false,
        reason: 'insufficient_volume'
      }
    })
  })

  it('returns an empty response instead of upserting when the RuleFeedback table is unavailable', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockQueryRaw.mockResolvedValue([{ exists: false }])

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ value: 'helpful' })
      }) as any,
      { params: Promise.resolve({ ruleId: 'rule-1' }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      currentUserFeedback: null,
      summary: {
        totalResponses: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        helpfulRatio: 0
      },
      credibility: {
        publicEligible: false,
        reason: 'insufficient_volume'
      }
    })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('returns an empty response instead of upserting when the Prisma ruleFeedback delegate is unavailable', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.ruleFeedback = undefined as any

    const response = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ value: 'helpful' })
      }) as any,
      { params: Promise.resolve({ ruleId: 'rule-1' }) }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      currentUserFeedback: null,
      summary: {
        totalResponses: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        helpfulRatio: 0
      },
      credibility: {
        publicEligible: false,
        reason: 'insufficient_volume'
      }
    })
    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })
})
