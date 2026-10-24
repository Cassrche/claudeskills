import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

describe('trackInteraction', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    Reflect.deleteProperty(window, 'op')
    jest.clearAllMocks()
  })

  it('does not track outside production', () => {
    const track = jest.fn()
    Reflect.set(window, 'op', {
      clear: jest.fn(),
      identify: jest.fn(),
      track
    })
    process.env.NODE_ENV = 'test'

    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      label: 'test_cta',
      location: 'test'
    })

    expect(track).not.toHaveBeenCalled()
  })

  it('passes production events and properties to OpenPanel', () => {
    const track = jest.fn()
    Reflect.set(window, 'op', {
      clear: jest.fn(),
      identify: jest.fn(),
      track
    })
    process.env.NODE_ENV = 'production'

    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      label: 'test_cta',
      location: 'test',
      target: '/rules'
    })

    expect(track).toHaveBeenCalledWith('cta_clicked', {
      label: 'test_cta',
      location: 'test',
      target: '/rules'
    })
  })
})
