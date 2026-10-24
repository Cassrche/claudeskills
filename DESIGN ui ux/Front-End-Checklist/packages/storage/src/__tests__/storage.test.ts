import { openDB } from 'idb'
import { storage } from '../index'

jest.mock('idb', () => ({
  openDB: jest.fn()
}))

type StorageMock = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
  key: (index: number) => string | null
  readonly length: number
}

function createStorageMock(): StorageMock {
  let store: Record<string, string> = {}

  return {
    getItem: key => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: key => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: index => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    }
  }
}

function installCookieMock() {
  let cookieStore = ''
  Object.defineProperty(global, 'document', {
    value: {
      get cookie() {
        return cookieStore
      },
      set cookie(value: string) {
        const [pair] = value.split(';')
        const [name, rawValue] = pair.split('=')
        const nextValue = `${name}=${rawValue}`
        const parts = cookieStore
          .split(';')
          .map(part => part.trim())
          .filter(Boolean)
          .filter(part => !part.startsWith(`${name}=`))
        parts.push(nextValue)
        cookieStore = parts.join('; ')
      }
    },
    configurable: true
  })
}

describe('@repo/storage', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    const localStorageMock = createStorageMock()
    const sessionStorageMock = createStorageMock()
    Object.defineProperty(global, 'window', {
      value: {
        localStorage: localStorageMock,
        sessionStorage: sessionStorageMock
      },
      configurable: true
    })
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      configurable: true
    })
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      configurable: true
    })
    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          estimate: jest.fn().mockResolvedValue({ usage: 128, quota: 1024 }),
          persist: jest.fn().mockResolvedValue(true)
        }
      },
      configurable: true
    })
    installCookieMock()
    ;(storage as any).db = null
    ;(storage as any).memoryCache = new Map()
    ;(openDB as jest.Mock).mockReset()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    delete (global as any).window
    delete (global as any).localStorage
    delete (global as any).sessionStorage
    delete (global as any).navigator
    delete (global as any).document
    ;(storage as any).db = null
    ;(storage as any).memoryCache = new Map()
    consoleErrorSpy.mockRestore()
  })

  it('initializes IndexedDB stores', async () => {
    const createObjectStore = jest.fn()
    const db = {
      objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
      createObjectStore
    }
    ;(openDB as jest.Mock).mockImplementation(async (_name, _version, options) => {
      options.upgrade(db)
      return { put: jest.fn(), get: jest.fn(), delete: jest.fn(), clear: jest.fn() }
    })

    await storage.init()

    expect(openDB).toHaveBeenCalled()
    expect(createObjectStore).toHaveBeenCalledWith('progress')
    expect(createObjectStore).toHaveBeenCalledWith('preferences')
    expect(createObjectStore).toHaveBeenCalledWith('cache')
  })

  it('supports local, session, and cookie helpers', () => {
    storage.setLocal('fec_local', { ok: true })
    expect(storage.getLocal('fec_local')).toEqual({ ok: true })

    storage.setSession('session-key', { ok: true })
    expect(storage.getSession('session-key')).toEqual({ ok: true })
    storage.removeSession('session-key')
    expect(storage.getSession('session-key')).toBeNull()

    storage.setCookie('fec_cookie', 'cookie-value', 1)
    expect(storage.getCookie('fec_cookie')).toBe('cookie-value')
    storage.removeCookie('fec_cookie')
    expect(storage.getCookie('fec_cookie')).toBe('')
  })

  it('returns early when browser APIs are unavailable', async () => {
    delete (global as any).window
    delete (global as any).localStorage
    delete (global as any).sessionStorage
    delete (global as any).document
    delete (global as any).navigator

    storage.setLocal('fec_local', { ok: true })
    expect(storage.getLocal('fec_local')).toBeNull()
    storage.removeLocal('fec_local')
    storage.clearLocal()
    storage.setSession('session-key', { ok: true })
    expect(storage.getSession('session-key')).toBeNull()
    storage.removeSession('session-key')
    storage.setCookie('fec_cookie', 'value')
    expect(storage.getCookie('fec_cookie')).toBeNull()
    storage.removeCookie('fec_cookie')
    await expect(storage.getStorageSize()).resolves.toEqual({ used: 0, quota: 0 })
    await expect(storage.requestPersistence()).resolves.toBe(false)
  })

  it('removes expired and outdated local cache entries', () => {
    localStorage.setItem(
      'expired',
      JSON.stringify({
        key: 'expired',
        value: 'old',
        version: '1.0.0',
        expiresAt: new Date(Date.now() - 1000).toISOString()
      })
    )
    localStorage.setItem(
      'stale-version',
      JSON.stringify({
        key: 'stale-version',
        value: 'old',
        version: '0.0.1'
      })
    )

    expect(storage.getLocal('expired')).toBeNull()
    expect(storage.getLocal('stale-version')).toBeNull()
  })

  it('handles malformed local and session storage gracefully', () => {
    localStorage.setItem('broken', '{bad json')
    sessionStorage.setItem('broken-session', '{bad json')

    expect(storage.getLocal('broken')).toBeNull()
    expect(storage.getSession('broken-session')).toBeNull()
  })

  it('handles local and session storage write failures gracefully', () => {
    const failingStorage = {
      setItem: jest.fn(() => {
        throw new Error('boom')
      }),
      getItem: jest.fn(() => null),
      removeItem: jest.fn(() => {
        throw new Error('boom')
      }),
      clear: jest.fn(),
      key: jest.fn(() => null),
      get length() {
        return 0
      }
    }
    Object.defineProperty(global, 'localStorage', { value: failingStorage, configurable: true })
    Object.defineProperty(global, 'sessionStorage', { value: failingStorage, configurable: true })
    ;(window as any).localStorage = failingStorage
    ;(window as any).sessionStorage = failingStorage

    storage.setLocal('fec_local', 'value')
    expect((storage as any).memoryCache.get('fec_local')).toBe('value')
    storage.removeLocal('fec_local')
    storage.setSession('session-key', 'value')
    storage.removeSession('session-key')

    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('proxies IndexedDB operations', async () => {
    const db = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ saved: true }),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    }
    ;(storage as any).db = db

    await storage.setIndexedDB('progress', 'all', { value: true })
    expect(db.put).toHaveBeenCalledWith('progress', { value: true }, 'all')

    expect(await storage.getIndexedDB('progress', 'all')).toEqual({ saved: true })
    expect(db.get).toHaveBeenCalledWith('progress', 'all')

    await storage.removeIndexedDB('progress', 'all')
    expect(db.delete).toHaveBeenCalledWith('progress', 'all')

    await storage.clearIndexedDB('progress')
    expect(db.clear).toHaveBeenCalledWith('progress')

    await storage.clearIndexedDB()
    expect(db.clear).toHaveBeenCalledWith('preferences')
    expect(db.clear).toHaveBeenCalledWith('cache')
  })

  it('handles IndexedDB failures', async () => {
    const db = {
      put: jest.fn().mockRejectedValue(new Error('put failed')),
      get: jest.fn().mockRejectedValue(new Error('get failed')),
      delete: jest.fn().mockRejectedValue(new Error('delete failed')),
      clear: jest.fn().mockRejectedValue(new Error('clear failed'))
    }
    ;(storage as any).db = db

    await expect(storage.setIndexedDB('progress', 'all', { value: true })).rejects.toThrow(
      'put failed'
    )
    await expect(storage.getIndexedDB('progress', 'all')).resolves.toBeNull()
    await expect(storage.removeIndexedDB('progress', 'all')).resolves.toBeUndefined()
    await expect(storage.clearIndexedDB('progress')).resolves.toBeUndefined()

    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('saves and loads progress and preferences', async () => {
    jest.spyOn(storage, 'setIndexedDB').mockResolvedValue(undefined)
    jest
      .spyOn(storage, 'getIndexedDB')
      .mockResolvedValueOnce([{ ruleId: 'rule-1', completed: true }])
      .mockResolvedValueOnce({
        theme: 'dark',
        locale: 'en',
        selectedCategories: [],
        selectedPriorities: [],
        showCompleted: true,
        sortBy: 'priority',
        sortOrder: 'asc'
      })

    await storage.saveProgress([{ ruleId: 'rule-1', completed: true } as any])
    expect(storage.setIndexedDB).toHaveBeenCalledWith('progress', 'all', [
      { ruleId: 'rule-1', completed: true }
    ])

    await storage.savePreferences({
      theme: 'dark',
      locale: 'en',
      selectedCategories: [],
      selectedPriorities: [],
      showCompleted: true,
      sortBy: 'priority',
      sortOrder: 'asc'
    })

    expect(await storage.loadProgress()).toEqual([{ ruleId: 'rule-1', completed: true }])
    expect(await storage.loadPreferences()).toEqual({
      theme: 'dark',
      locale: 'en',
      selectedCategories: [],
      selectedPriorities: [],
      showCompleted: true,
      sortBy: 'priority',
      sortOrder: 'asc'
    })
  })

  it('returns defaults when persistence APIs fail', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          estimate: jest.fn().mockRejectedValue(new Error('estimate failed')),
          persist: jest.fn().mockRejectedValue(new Error('persist failed'))
        }
      },
      configurable: true
    })

    await expect(storage.getStorageSize()).resolves.toEqual({ used: 0, quota: 0 })
    await expect(storage.requestPersistence()).resolves.toBe(false)
  })

  it('reports storage capacity and persistence support', async () => {
    await expect(storage.getStorageSize()).resolves.toEqual({ used: 128, quota: 1024 })
    await expect(storage.requestPersistence()).resolves.toBe(true)
  })

  it('exports and clears persisted project data', async () => {
    jest
      .spyOn(storage, 'loadProgress')
      .mockResolvedValue([{ ruleId: 'rule-1', completed: true } as any])
    jest.spyOn(storage, 'loadPreferences').mockResolvedValue({ theme: 'dark' } as any)
    jest.spyOn(storage, 'clearIndexedDB').mockResolvedValue(undefined)

    localStorage.setItem('fec_cache_item', JSON.stringify({ ok: true }))
    localStorage.setItem('other_app_item', JSON.stringify({ keep: true }))
    // biome-ignore lint/suspicious/noDocumentCookie: Test intentionally seeds cookie state through the mocked document API.
    document.cookie = 'fec_cookie=value'
    // biome-ignore lint/suspicious/noDocumentCookie: Test intentionally seeds cookie state through the mocked document API.
    document.cookie = 'other_cookie=value'

    await expect(storage.exportAllData()).resolves.toEqual({
      progress: [{ ruleId: 'rule-1', completed: true }],
      preferences: { theme: 'dark' },
      localStorage: { fec_cache_item: { ok: true } }
    })

    await storage.clearAllData()

    expect(storage.clearIndexedDB).toHaveBeenCalled()
    expect(localStorage.getItem('fec_cache_item')).toBeNull()
    expect(localStorage.getItem('other_app_item')).toBe(JSON.stringify({ keep: true }))
  })

  it('skips invalid local export payloads without throwing', async () => {
    jest.spyOn(storage, 'loadProgress').mockResolvedValue([])
    jest.spyOn(storage, 'loadPreferences').mockResolvedValue(null)
    localStorage.setItem('fec_invalid', '{bad json')
    localStorage.setItem('fec_valid', JSON.stringify({ ok: true }))

    await expect(storage.exportAllData()).resolves.toEqual({
      progress: [],
      preferences: null,
      localStorage: { fec_valid: { ok: true } }
    })
  })
})
