import { render, screen } from '@/test-utils'

jest.mock('../install-links', () => ({
  getCursorInstallUrl: jest.fn(() => 'cursor://install'),
  getVscodeInstallUrl: jest.fn(() => 'vscode://install')
}))

jest.mock('../mcp-page-content', () => ({
  McpPageContent: ({
    cursorInstallUrl,
    vscodeInstallUrl
  }: {
    cursorInstallUrl: string
    vscodeInstallUrl: string
  }) => <div>{`${cursorInstallUrl}:${vscodeInstallUrl}`}</div>
}))

jest.mock('@/lib/seo', () => ({
  pageMetadata: { mcp: { title: 'MCP' } }
}))

const McpPage = require('../page').default as typeof import('../page').default

describe('McpPage', () => {
  it('renders the MCP page content with install URLs', async () => {
    const view = await McpPage()

    render(view)

    expect(screen.getByText('cursor://install:vscode://install')).toBeInTheDocument()
    expect(screen.getByText('MCP Integration')).toBeInTheDocument()
  })
})
