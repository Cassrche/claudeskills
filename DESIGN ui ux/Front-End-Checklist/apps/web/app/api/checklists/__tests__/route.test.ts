/**
 * @jest-environment node
 */

const mockGetSession = jest.fn()
const mockFindMany = jest.fn()
const mockCreate = jest.fn()

jest.mock('@repo/auth/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession
    }
  }
}))

jest.mock('@repo/auth/prisma', () => ({
  prisma: {
    userChecklist: {
      findMany: mockFindMany,
      create: mockCreate
    }
  }
}))

jest.mock('next/headers', () => ({
  headers: jest.fn()
}))

jest.mock('@/lib/bot-protection', () => ({
  rejectIfBot: jest.fn()
}))

jest.mock('@/lib/telemetry-server', () => ({
  captureServerException: jest.fn(),
  trackServerEvent: jest.fn()
}))

const { headers } = require('next/headers')
const { rejectIfBot } = require('@/lib/bot-protection')
const { trackServerEvent } = require('@/lib/telemetry-server')
const { GET, POST } = require('../route')

describe('checklists route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    headers.mockResolvedValue(new Headers())
    rejectIfBot.mockResolvedValue(null)
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
  })

  it('returns framework data when listing persisted checklists', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'checklist-1',
        publicId: null,
        name: 'Launch',
        description: 'Ship checklist',
        framework: 'vite',
        ruleIds: ['rule-1'],
        color: null,
        createdAt: new Date('2026-03-12T10:00:00.000Z'),
        updatedAt: new Date('2026-03-12T11:00:00.000Z')
      }
    ])

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      {
        id: 'checklist-1',
        publicId: undefined,
        name: 'Launch',
        description: 'Ship checklist',
        framework: 'vite',
        ruleIds: ['rule-1'],
        color: undefined,
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T11:00:00.000Z'
      }
    ])
  })

  it('persists framework selection when creating a checklist', async () => {
    mockCreate.mockResolvedValue({
      id: 'checklist-1',
      publicId: null,
      name: 'Launch',
      description: 'Ship checklist',
      framework: 'astro',
      ruleIds: ['rule-1'],
      color: null,
      createdAt: new Date('2026-03-12T10:00:00.000Z'),
      updatedAt: new Date('2026-03-12T11:00:00.000Z')
    })

    const response = await POST(
      new Request('http://localhost/api/checklists', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Launch',
          description: 'Ship checklist',
          framework: 'astro',
          ruleIds: ['rule-1']
        })
      })
    )

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Launch',
        description: 'Ship checklist',
        framework: 'astro',
        ruleIds: ['rule-1']
      }
    })
    expect(response.status).toBe(200)
    expect(trackServerEvent).toHaveBeenCalledTimes(1)
    expect(trackServerEvent).toHaveBeenCalledWith('checklist_created', {
      checklistId: 'checklist-1',
      ruleCount: 1,
      userId: 'user-1'
    })
  })
})
