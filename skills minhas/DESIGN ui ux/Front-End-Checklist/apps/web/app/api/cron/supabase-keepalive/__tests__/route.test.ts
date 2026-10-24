/**
 * @jest-environment node
 */

const mockQueryRaw = jest.fn()
const mockCaptureServerException = jest.fn()

jest.mock('@repo/auth/prisma', () => ({
  prisma: {
    $queryRaw: mockQueryRaw
  }
}))

jest.mock('@/lib/telemetry-server', () => ({
  captureServerException: mockCaptureServerException
}))

const { GET } = require('../route') as typeof import('../route')

describe('supabase keepalive cron route', () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-cron-secret'
    mockQueryRaw.mockResolvedValue([{ alive: 1 }])
  })

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret
  })

  it('does not query Supabase when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET

    const response = await GET(
      new Request('http://localhost/api/cron/supabase-keepalive', {
        headers: {
          Authorization: 'Bearer test-cron-secret'
        }
      })
    )

    expect(response.status).toBe(503)
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })

  it('rejects requests without authorization', async () => {
    const response = await GET(new Request('http://localhost/api/cron/supabase-keepalive'))

    expect(response.status).toBe(401)
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })

  it('rejects requests with the wrong bearer token', async () => {
    const response = await GET(
      new Request('http://localhost/api/cron/supabase-keepalive', {
        headers: {
          Authorization: 'Bearer wrong-secret'
        }
      })
    )

    expect(response.status).toBe(401)
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })

  it('runs a harmless Supabase read with the correct bearer token', async () => {
    const response = await GET(
      new Request('http://localhost/api/cron/supabase-keepalive', {
        headers: {
          Authorization: 'Bearer test-cron-secret'
        }
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mockQueryRaw).toHaveBeenCalledTimes(1)
  })

  it('returns a service error when the keepalive query fails', async () => {
    const error = new Error('database unavailable')
    mockQueryRaw.mockRejectedValue(error)

    const response = await GET(
      new Request('http://localhost/api/cron/supabase-keepalive', {
        headers: {
          Authorization: 'Bearer test-cron-secret'
        }
      })
    )

    expect(response.status).toBe(503)
    expect(mockCaptureServerException).toHaveBeenCalledWith(error, {
      route: '/api/cron/supabase-keepalive'
    })
  })
})
