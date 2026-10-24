'use client'

import Link from 'next/link'
import { type ComponentPropsWithoutRef, forwardRef, type MouseEvent } from 'react'
import type { TelemetryEventName } from '@/lib/telemetry-events'
import { type InteractionTelemetryProperties, trackInteraction } from '@/lib/telemetry-interactions'

interface TrackedLinkProps extends Omit<ComponentPropsWithoutRef<'a'>, 'href'> {
  href: string
  telemetryEvent: TelemetryEventName
  telemetryProperties: InteractionTelemetryProperties
}

/** Render a link that records a user-intent telemetry event before navigation. */
export const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(function TrackedLink(
  { href, telemetryEvent, telemetryProperties, onClick, target, rel, ...props },
  ref
) {
  const isInternal = href.startsWith('/')

  /** Track the click before preserving any caller-provided click behavior. */
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackInteraction(telemetryEvent, {
      ...telemetryProperties,
      target: telemetryProperties.target ?? href
    })
    onClick?.(event)
  }

  if (isInternal) {
    return <Link ref={ref} href={href} onClick={handleClick} {...props} />
  }

  return (
    <a
      ref={ref}
      href={href}
      target={target ?? '_blank'}
      rel={rel ?? 'noopener noreferrer'}
      onClick={handleClick}
      {...props}
    />
  )
})
