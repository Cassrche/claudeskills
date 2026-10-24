import { OpenPanelAnalyticsComponent } from './providers/openpanel'

interface AnalyticsProviderProps {
  readonly clientId?: string
  readonly nonce?: string
}

/**
 * Provider component that injects analytics tracking scripts for all configured providers.
 *
 * @param props - Component properties
 * @param props.clientId - Client ID for OpenPanel Analytics
 * @param props.nonce - Optional CSP nonce for the injected scripts
 *
 * @returns Analytics script components
 *
 * @example
 * ```tsx
 * <AnalyticsProvider clientId="op_abc123" />
 * ```
 */
export function AnalyticsProvider({ clientId, nonce }: AnalyticsProviderProps) {
  if (!clientId?.trim()) {
    return null
  }

  return <OpenPanelAnalyticsComponent clientId={clientId} nonce={nonce} />
}
