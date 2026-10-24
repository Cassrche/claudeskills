const REMOTE_DATA_ENABLED =
  process.env.NODE_ENV === 'production' || process.env.ENABLE_REMOTE_DATA_FETCH === 'true'

/**
 * shouldFetchRemoteData function.
 */
export function shouldFetchRemoteData() {
  return REMOTE_DATA_ENABLED
}

/**
 * getFetchTimeoutOptions function.
 * @param timeoutMs - timeoutMs.
 */
export function getFetchTimeoutOptions(timeoutMs: number = 3000) {
  if (typeof AbortSignal.timeout !== 'function') {
    return {}
  }

  return { signal: AbortSignal.timeout(timeoutMs) }
}
