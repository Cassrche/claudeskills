import { getInitSnippet } from '@openpanel/web'

interface OpenPanelAnalyticsProps {
  clientId: string
  nonce?: string
}

/**
 * OpenPanel Analytics component that uses a proxy route and server-rendered scripts.
 *
 * @param props - Component properties
 * @param props.clientId - OpenPanel client ID from the dashboard
 * @param props.nonce - Optional CSP nonce for the injected scripts
 * @returns Script tags configured with proxy URLs and global properties, or null if no clientId
 */
export const OpenPanelAnalyticsComponent = ({ clientId, nonce }: OpenPanelAnalyticsProps) => {
  if (!clientId) {
    return null
  }

  const initOptions = {
    apiUrl: '/api/op',
    clientId,
    disabled: process.env.NODE_ENV !== 'production',
    sdk: 'nextjs',
    sdkVersion: '1.3.0',
    trackAttributes: true,
    trackOutgoingLinks: true,
    trackScreenViews: true
  }
  const globalProperties = {
    environment: process.env.NODE_ENV ?? 'development'
  }
  const initScript = `${getInitSnippet()}
window.op('init', ${JSON.stringify(initOptions)});
window.op('setGlobalProperties', ${JSON.stringify(globalProperties)});`

  return (
    <>
      <script async={true} defer={true} nonce={nonce} src="/api/op/op1.js" />
      <script dangerouslySetInnerHTML={{ __html: initScript }} id="openpanel-init" nonce={nonce} />
    </>
  )
}
