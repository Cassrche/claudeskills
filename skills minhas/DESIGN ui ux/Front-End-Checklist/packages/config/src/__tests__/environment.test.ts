import {
  Environment,
  env,
  getEnv,
  getEnvBoolean,
  getEnvJson,
  getEnvNumber,
  getEnvString
} from '../environment'

describe('@repo/config environment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    env.clearCache()
  })

  afterAll(() => {
    process.env = originalEnv
    env.clearCache()
  })

  it('returns the same singleton instance', () => {
    expect(Environment.getInstance()).toBe(env)
  })

  it('reads environment variables using supported key formats', () => {
    process.env.NEXT_PUBLIC_CUSTOM_KEY = 'hello'
    process.env.ANOTHER_KEY = 'world'

    expect(env.get('customKey')).toBe('hello')
    expect(env.get('anotherKey')).toBe('world')
  })

  it('caches environment lookups until the cache is cleared', () => {
    process.env.NEXT_PUBLIC_CACHE_TEST = 'first'

    expect(env.get('cacheTest')).toBe('first')

    process.env.NEXT_PUBLIC_CACHE_TEST = 'second'
    expect(env.get('cacheTest')).toBe('first')

    env.clearCache()
    expect(env.get('cacheTest')).toBe('second')
  })

  it('returns default values when variables are missing', () => {
    expect(env.get('missingKey', 'fallback')).toBe('fallback')
    expect(env.getString('missingString', 'fallback')).toBe('fallback')
    expect(env.getNumber('missingNumber', 42)).toBe(42)
    expect(env.getBoolean('missingBoolean', true)).toBe(true)
    expect(env.getJson('missingJson', { ok: true })).toEqual({ ok: true })
  })

  it('parses strings, numbers, booleans, and JSON values', () => {
    process.env.NEXT_PUBLIC_NAME = 'Front-End Checklist'
    process.env.NEXT_PUBLIC_TIMEOUT = '120'
    process.env.NEXT_PUBLIC_ENABLED = 'true'
    process.env.NEXT_PUBLIC_DISABLED = '0'
    process.env.NEXT_PUBLIC_SETTINGS = JSON.stringify({ theme: 'dark' })

    expect(env.getString('name')).toBe('Front-End Checklist')
    expect(env.getNumber('timeout')).toBe(120)
    expect(env.getBoolean('enabled')).toBe(true)
    expect(env.getBoolean('disabled')).toBe(false)
    expect(env.getJson('settings')).toEqual({ theme: 'dark' })
  })

  it('falls back when numeric or JSON parsing fails', () => {
    process.env.NEXT_PUBLIC_BAD_NUMBER = 'abc'
    process.env.NEXT_PUBLIC_BAD_JSON = '{bad'

    expect(env.getNumber('badNumber', 7)).toBe(7)
    expect(env.getJson('badJson', { fallback: true })).toEqual({ fallback: true })
  })

  it('uses the convenience helper exports', () => {
    process.env.NEXT_PUBLIC_ALPHA = 'one'
    process.env.NEXT_PUBLIC_FLAG = '1'
    process.env.NEXT_PUBLIC_PORT = '3000'
    process.env.NEXT_PUBLIC_DATA = JSON.stringify({ alpha: 1 })

    expect(getEnv('alpha')).toBe('one')
    expect(getEnvString('alpha')).toBe('one')
    expect(getEnvBoolean('flag')).toBe(true)
    expect(getEnvNumber('port')).toBe(3000)
    expect(getEnvJson('data')).toEqual({ alpha: 1 })
  })
})
