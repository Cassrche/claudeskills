'use client'

import { Button } from '@repo/design-system/ui/button'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Fallback UI when an error is caught. Receives reset callback to clear error state. */
  fallback?: ReactNode | ((reset: () => void) => ReactNode)
  /** Shorthand: renders SectionErrorFallback with this name and a retry button. Serializable from server components. */
  sectionName?: string
  /** Optional callback when an error is caught (e.g. for logging). */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Class-based error boundary. Catches render errors in children and shows fallback UI.
 * Must be a class component — React does not yet provide a hooks-based API for error boundaries.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback, sectionName } = this.props

      if (sectionName) {
        return <SectionErrorFallback sectionName={sectionName} onRetry={this.handleReset} />
      }

      if (typeof fallback === 'function') {
        return fallback(this.handleReset)
      }

      return (
        fallback ?? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-foreground text-sm"
          >
            <p className="font-medium">Something went wrong</p>
            <Button variant="outline" size="sm" onClick={this.handleReset} className="mt-2">
              Try again
            </Button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export interface SectionErrorFallbackProps {
  /** Section name for the message (e.g. "Hero", "Sponsors"). */
  sectionName?: string
  /** Optional retry handler. If omitted, no retry button is shown. */
  onRetry?: () => void
}

/**
 * Fallback UI for a section that failed to render. Use inside ErrorBoundary as fallback.
 */
export function SectionErrorFallback({
  sectionName = 'This section',
  onRetry
}: SectionErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-muted-foreground/30 border-dashed bg-muted/30 px-4 py-8 text-center"
    >
      <p className="text-muted-foreground text-sm">{sectionName} couldn’t be loaded.</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      )}
    </div>
  )
}
