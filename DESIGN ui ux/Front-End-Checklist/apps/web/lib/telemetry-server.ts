import 'server-only'

import * as Sentry from '@sentry/nextjs'
import { hasOpenPanelServerConfig, opServer } from '@thedaviddias/analytics/server'
import { TELEMETRY_EVENTS, type TelemetryEventName } from './telemetry-events'

export interface ServerTelemetryProperties {
  [key: string]: unknown
}

interface ServerErrorContext {
  route: string
  userId?: string | null
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

const sentryDsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()

/**
 * Track a server-side event without blocking the response path.
 *
 * @param event - Stable event name from the shared telemetry catalog.
 * @param properties - Optional event properties to attach to the analytics event.
 */
export function trackServerEvent(
  event: TelemetryEventName,
  properties: ServerTelemetryProperties = {}
) {
  if (process.env.NODE_ENV !== 'production' || !hasOpenPanelServerConfig) {
    return
  }

  void opServer.track(event, properties).catch(error => {
    if (!sentryDsn) {
      return
    }

    Sentry.captureException(error, {
      tags: {
        'app.feature': 'telemetry',
        'app.telemetry_event': event
      },
      extra: properties
    })
  })
}

/**
 * Capture a server-side exception in Sentry and mirror a lightweight failure event to OpenPanel.
 *
 * @param error - Unknown thrown value.
 * @param context - Route and user context for triage.
 */
export function captureServerException(error: unknown, context: ServerErrorContext) {
  const normalizedError = error instanceof Error ? error : new Error(String(error))

  if (sentryDsn) {
    Sentry.captureException(normalizedError, {
      tags: {
        'app.feature': 'api',
        'app.route': context.route,
        ...(context.tags ?? {})
      },
      extra: context.extra,
      ...(context.userId ? { user: { id: context.userId } } : {})
    })
  }

  trackServerEvent(TELEMETRY_EVENTS.apiRequestFailed, {
    route: context.route,
    userId: context.userId ?? null,
    errorName: normalizedError.name,
    ...context.extra
  })
}
