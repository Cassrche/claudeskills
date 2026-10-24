'use client'

import { CopyButton, type CopyButtonProps } from '@repo/design-system/custom/feedback/copy-button'
import type { TelemetryEventName } from '@/lib/telemetry-events'
import { type InteractionTelemetryProperties, trackInteraction } from '@/lib/telemetry-interactions'

interface TrackedCopyButtonProps extends CopyButtonProps {
  telemetryEvent: TelemetryEventName
  telemetryProperties: InteractionTelemetryProperties
}

/** Render a copy button that records telemetry after a successful clipboard write. */
export function TrackedCopyButton({
  telemetryEvent,
  telemetryProperties,
  onCopySuccess,
  ...props
}: TrackedCopyButtonProps) {
  /** Preserve caller callbacks while emitting standardized copy telemetry. */
  const handleCopySuccess = () => {
    trackInteraction(telemetryEvent, telemetryProperties)
    onCopySuccess?.()
  }

  return <CopyButton onCopySuccess={handleCopySuccess} {...props} />
}
