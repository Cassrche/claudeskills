import { act, renderHook } from '@testing-library/react'
import { useScrollDirection } from '@/hooks/use-scroll-direction'

let rafCallbacks: FrameRequestCallback[] = []

function flushRAF() {
  const cbs = rafCallbacks.splice(0)
  for (const cb of cbs) cb(performance.now())
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true })
}

function scrollTo(y: number) {
  setScrollY(y)
  window.dispatchEvent(new Event('scroll'))
  flushRAF()
}

beforeEach(() => {
  rafCallbacks = []
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return rafCallbacks.length
  })
  setScrollY(0)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useScrollDirection', () => {
  it('returns "up" on initial render', () => {
    const { result } = renderHook(() => useScrollDirection(10))
    expect(result.current).toBe('up')
  })

  it('returns "up" when at the top of the page', () => {
    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(0))

    expect(result.current).toBe('up')
  })

  it('returns "down" after scrolling down past the threshold', () => {
    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(50))

    expect(result.current).toBe('down')
  })

  it('returns "up" after scrolling back up past the threshold', () => {
    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(100))
    act(() => scrollTo(50))

    expect(result.current).toBe('up')
  })

  it('does not change direction when scroll delta is below the threshold', () => {
    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(100))
    expect(result.current).toBe('down')

    act(() => scrollTo(95))
    expect(result.current).toBe('down')
  })

  it('returns "up" when the page loads with a restored scroll position', () => {
    setScrollY(500)

    const { result } = renderHook(() => useScrollDirection(10))

    expect(result.current).toBe('up')
  })

  it('does not report "down" on the first scroll event after reload at a restored position', () => {
    setScrollY(500)

    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(505))

    expect(result.current).toBe('up')
  })

  it('correctly detects "down" after small continued scroll from a restored position', () => {
    setScrollY(500)

    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(520))

    expect(result.current).toBe('down')
  })

  it('correctly detects "up" when scrolling up from a restored position', () => {
    setScrollY(500)

    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(480))

    expect(result.current).toBe('up')
  })

  it('resets to "up" when scrolled back to the very top', () => {
    const { result } = renderHook(() => useScrollDirection(10))

    act(() => scrollTo(100))
    expect(result.current).toBe('down')

    act(() => scrollTo(0))
    expect(result.current).toBe('up')
  })
})
