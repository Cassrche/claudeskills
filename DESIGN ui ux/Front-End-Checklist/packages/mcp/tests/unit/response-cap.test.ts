import { capResponseText, DEFAULT_MAX_RESPONSE_CHARS } from '../../src/utils/response-cap'

describe('response-cap', () => {
  it('returns text unchanged when under limit', () => {
    const short = '{"ok": true}'
    expect(capResponseText(short, 1000)).toBe(short)
    expect(capResponseText(short)).toBe(short)
  })

  it('truncates and appends suffix when over limit', () => {
    const long = 'x'.repeat(40_000)
    const out = capResponseText(long, 1000)
    expect(out.length).toBeLessThanOrEqual(1000 + 60)
    expect(out).toContain('[... response truncated to stay within token budget ...]')
  })

  it('prefers cutting at newline when possible', () => {
    const chunk = '{"a": 1}\n{"b": 2}\n'
    const long = chunk.repeat(500)
    const out = capResponseText(long, 500)
    expect(out.endsWith('[... response truncated to stay within token budget ...]')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(500 + 60)
  })

  it('uses default max when not provided', () => {
    const long = 'x'.repeat(DEFAULT_MAX_RESPONSE_CHARS + 1000)
    const out = capResponseText(long)
    expect(out.length).toBeLessThanOrEqual(DEFAULT_MAX_RESPONSE_CHARS + 60)
  })
})
