/**
 * @jest-environment node
 */

const mockGetSession = jest.fn()
const mockFindFirst = jest.fn()
const mockUpdate = jest.fn()
const mockDeleteMany = jest.fn()

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
      findFirst: mockFindFirst,
      update: mockUpdate,
      deleteMany: mockDeleteMany
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
const { PATCH } = require('../route')

describe('checklist detail route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    headers.mockResolvedValue(new Headers())
    rejectIfBot.mockResolvedValue(null)
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindFirst.mockResolvedValue({ id: 'checklist-1', userId: 'user-1' })
  })

  it('updates the optional framework field', async () => {
    mockUpdate.mockResolvedValue({
      id: 'checklist-1',
      publicId: null,
      name: 'Launch',
      description: null,
      framework: 'sveltekit',
      ruleIds: ['rule-1'],
      color: null,
      createdAt: new Date('2026-03-12T10:00:00.000Z'),
      updatedAt: new Date('2026-03-12T11:00:00.000Z')
    })

    const response = await PATCH(
      new Request('http://localhost/api/checklists/checklist-1', {
        method: 'PATCH',
        body: JSON.stringify({ framework: 'sveltekit' })
      }),
      { params: Promise.resolve({ id: 'checklist-1' }) }
    )

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'checklist-1' },
      data: { framework: 'sveltekit' }
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      id: 'checklist-1',
      framework: 'sveltekit'
    })
    expect(trackServerEvent).toHaveBeenCalledTimes(1)
    expect(trackServerEvent).toHaveBeenCalledWith('checklist_updated', {
      checklistId: 'checklist-1',
      updatedFields: ['framework'],
      userId: 'user-1'
    })
  })
})
