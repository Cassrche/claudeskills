'use client'

import { type ClientTelemetryProperties, trackClientEvent } from './telemetry-client'
import type { TelemetryEventName } from './telemetry-events'

export { TELEMETRY_EVENTS } from './telemetry-events'

export interface InteractionTelemetryProperties extends ClientTelemetryProperties {
  location: string
  label: string
  target?: string
}

/**
 * Track a user-initiated client interaction with a consistent property contract.
 *
 * @param event - Stable telemetry event name.
 * @param properties - Interaction context such as location, label, target, and entity IDs.
 */
export function trackInteraction(
  event: TelemetryEventName,
  properties: InteractionTelemetryProperties
) {
  trackClientEvent(event, properties)
}
