import 'server-only'

import { OpenPanel } from '@openpanel/sdk'

const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID?.trim() ?? ''
const clientSecret = process.env.OPENPANEL_CLIENT_SECRET?.trim() ?? ''

export const hasOpenPanelServerConfig = Boolean(clientId && clientSecret)

export const opServer = new OpenPanel({
  clientId,
  clientSecret
})
