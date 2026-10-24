'use client'

import type { TelemetryEventName } from './telemetry-events'

type TelemetryValue = boolean | null | number | string | Array<boolean | number | string>

export interface ClientTelemetryProperties {
  [key: string]: TelemetryValue | undefined
}

interface OpenPanelClient {
  clear: () => void
  identify: (payload: { profileId: string; properties?: Record<string, unknown> }) => void
  track: (event: string, properties?: Record<string, unknown>) => void
}

/**
 * Read the OpenPanel client from `window` using runtime checks instead of type assertions.
 *
 * @returns The OpenPanel client when available, otherwise null.
 */
function getOpenPanelClient(): OpenPanelClient | null {
  if (typeof window === 'undefined') {
    return null
  }

  const candidate = Reflect.get(window, 'op')
  if (typeof candidate !== 'object' || candidate === null) {
    return null
  }

  const clear = Reflect.get(candidate, 'clear')
  const identify = Reflect.get(candidate, 'identify')
  const track = Reflect.get(candidate, 'track')

  if (
    typeof clear !== 'function' ||
    typeof identify !== 'function' ||
    typeof track !== 'function'
  ) {
    return null
  }

  return {
    clear,
    identify,
    track
  }
}

/**
 * Track a client-side analytics event through OpenPanel when production analytics is enabled.
 *
 * @param event - Stable event name from the shared telemetry catalog.
 * @param properties - Optional event properties for funnel and usage analysis.
 */
export function trackClientEvent(
  event: TelemetryEventName,
  properties: ClientTelemetryProperties = {}
) {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
    return
  }

  const openPanel = getOpenPanelClient()

  if (!openPanel) {
    return
  }

  openPanel.track(event, properties)
}
