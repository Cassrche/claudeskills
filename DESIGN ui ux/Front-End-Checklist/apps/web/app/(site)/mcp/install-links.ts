import { MCP_SERVER_URL } from '@repo/config'

/**
 * Build the Cursor deeplink used to install the remote MCP server.
 *
 * @returns A Cursor deeplink containing the encoded server config.
 */
export function getCursorInstallUrl() {
  const config = {
    mcpServers: {
      'frontend-checklist': {
        url: MCP_SERVER_URL
      }
    }
  }
  const encodedConfig = Buffer.from(JSON.stringify(config)).toString('base64')
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=frontend-checklist&config=${encodedConfig}`
}

/**
 * Build the VS Code deeplink used to install the remote MCP server.
 *
 * @returns A VS Code redirect URL containing the encoded server config.
 */
export function getVscodeInstallUrl() {
  const config = { type: 'http', url: MCP_SERVER_URL }
  const encodedConfig = encodeURIComponent(JSON.stringify(config))
  return `https://vscode.dev/redirect/mcp/install?name=frontend-checklist&config=${encodedConfig}`
}
