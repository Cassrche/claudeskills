import { AnalyticsProvider } from './index'

export { OpenPanelIdentify } from './providers/openpanel-identify'

interface AnalyticsHeadProps {
  clientId?: string
  nonce?: string
}

/**
 * Backwards-compatible wrapper around AnalyticsProvider.
 *
 * @param props - Component properties
 * @param props.clientId - Client ID for OpenPanel Analytics
 * @param props.nonce - Optional CSP nonce for the injected scripts
 * @returns Analytics script components
 *
 * @example
 * ```tsx
 * <AnalyticsHead clientId="op_abc123" />
 * ```
 */
export function AnalyticsHead({ clientId, nonce }: AnalyticsHeadProps) {
  return <AnalyticsProvider clientId={clientId} nonce={nonce} />
}
