import { AlertCircle, CheckCircle2, Info, Scale, XCircle } from '@repo/design-system/icons'
import type { ReactNode } from 'react'

type CalloutType = 'tip' | 'warning' | 'error' | 'success' | 'exceptions'

export interface CalloutProps {
  type?: CalloutType
  title?: string
  children: ReactNode
}

const icons: Record<CalloutType, typeof Info> = {
  tip: Info,
  warning: AlertCircle,
  error: XCircle,
  success: CheckCircle2,
  exceptions: Scale
}

const defaultTitles: Record<CalloutType, string> = {
  tip: 'Good to Know',
  warning: 'Warning',
  error: "Don't Do This",
  success: 'Best Practice',
  exceptions: 'When to Break This Rule'
}

/** Renders a styled callout box with an icon, title, and content. */
export function Callout({ type = 'tip', title, children }: CalloutProps) {
  const Icon = icons[type]
  const displayTitle = title || defaultTitles[type]

  return (
    <div className={`callout callout-${type}`} role="note">
      <Icon className="callout-icon" aria-hidden="true" />
      <div className="callout-content">
        <div className="callout-title">{displayTitle}</div>
        <div className="callout-description">{children}</div>
      </div>
    </div>
  )
}

/** Creates a typed callout shorthand for use in MDX content. */
function createCallout(type: CalloutType) {
  /** Renders a callout of the specified type. */
  const Component = ({ title, children }: Omit<CalloutProps, 'type'>) => (
    <Callout type={type} title={title}>
      {children}
    </Callout>
  )
  Component.displayName = `${type.charAt(0).toUpperCase() + type.slice(1)}Callout`
  return Component
}

export const Tip = createCallout('tip')
export const Warning = createCallout('warning')
export const ErrorCallout = createCallout('error')
export const Success = createCallout('success')
export const Exceptions = createCallout('exceptions')
