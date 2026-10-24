import { STORAGE_KEYS } from '@repo/config'
import { storage } from '../index'

type LocalStorageMock = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
  key: (index: number) => string | null
  readonly length: number
}

function createLocalStorageMock(): LocalStorageMock {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    }
  }
}

describe('Storage.clearLocal', () => {
  beforeEach(() => {
    const localStorageMock = createLocalStorageMock()
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      configurable: true
    })
    Object.defineProperty(global, 'window', {
      value: {},
      configurable: true
    })
  })

  afterEach(() => {
    // Keep test globals isolated from other suites.
    delete (global as { localStorage?: LocalStorageMock }).localStorage
    delete (global as { window?: object }).window
  })

  it('removes only project-owned keys and keeps unrelated keys', () => {
    localStorage.setItem(STORAGE_KEYS.USER_PROGRESS, 'progress-data')
    localStorage.setItem('fec_custom_cache', 'custom')
    localStorage.setItem('other_app_key', 'external')

    storage.clearLocal()

    expect(localStorage.getItem(STORAGE_KEYS.USER_PROGRESS)).toBeNull()
    expect(localStorage.getItem('fec_custom_cache')).toBeNull()
    expect(localStorage.getItem('other_app_key')).toBe('external')
  })
})
