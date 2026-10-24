import { cn, debounce, formatDate, formatTechTerm } from '../public-api'

describe('@repo/utils', () => {
  it('merges class names with tailwind precedence', () => {
    expect(cn('px-2', false, 'px-4', 'text-sm')).toBe('px-4 text-sm')
  })

  it('formats dates with the default and custom pattern', () => {
    const date = new Date(2026, 2, 10)
    expect(formatDate(date)).toBe('2026-03-10')
    expect(formatDate(date, 'DD/MM/YYYY')).toBe('10/03/2026')
  })

  it('formats known and unknown tech terms', () => {
    expect(formatTechTerm('html')).toBe('HTML')
    expect(formatTechTerm('javascript')).toBe('JavaScript')
    expect(formatTechTerm('unknown')).toBe('Unknown')
  })

  it('debounces repeated invocations', () => {
    jest.useFakeTimers()
    const fn = jest.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')

    jest.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
    jest.useRealTimers()
  })
})
