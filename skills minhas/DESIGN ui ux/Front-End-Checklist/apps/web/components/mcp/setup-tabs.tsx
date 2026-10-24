'use client'

import { CodeSurface, InlineCode } from '@repo/design-system/custom/content/code-surface'
import { Button } from '@repo/design-system/ui/button'
import { Card, CardContent } from '@repo/design-system/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/ui/tabs'
import { useState } from 'react'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

interface SetupConfig {
  id: string
  title: string
  description: string
  config: string
}

interface SetupTabsProps {
  configs: SetupConfig[]
  cursorInstallUrl: string
  vscodeInstallUrl: string
}

/**
 * SetupTabs function.
 * @param { configs - { configs.
 * @param cursorInstallUrl } - cursorInstallUrl }.
 * @param vscodeInstallUrl - VS Code one-click install URL.
 */
export function SetupTabs({ configs, cursorInstallUrl, vscodeInstallUrl }: SetupTabsProps) {
  const [activeTab, setActiveTab] = useState(configs[0]?.id || '')

  /** Track the setup tab selected by the user. */
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    trackInteraction(TELEMETRY_EVENTS.mcpSetupClicked, {
      label: 'select_setup_tab',
      location: 'mcp_setup_tabs',
      target: value
    })
  }

  return (
    <Card className="overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex h-auto w-full overflow-x-auto rounded-none border-border border-b bg-background-subtle p-0">
          {configs.map(config => (
            <TabsTrigger
              key={config.id}
              value={config.id}
              variant="underline"
              className="rounded-none px-4 py-3"
            >
              {config.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {configs.map(config => (
          <TabsContent key={config.id} value={config.id}>
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <p className="text-foreground-muted text-sm">{config.description}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {config.id === 'cursor' ? (
                    <Button asChild size="sm">
                      <a
                        href={cursorInstallUrl}
                        onClick={() =>
                          trackInteraction(TELEMETRY_EVENTS.mcpSetupClicked, {
                            label: 'add_to_cursor',
                            location: 'mcp_setup_tabs',
                            target: 'cursor'
                          })
                        }
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Add to Cursor
                      </a>
                    </Button>
                  ) : null}
                  {config.id === 'vscode' ? (
                    <Button asChild size="sm">
                      <a
                        href={vscodeInstallUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackInteraction(TELEMETRY_EVENTS.mcpSetupClicked, {
                            label: 'install_in_vscode',
                            location: 'mcp_setup_tabs',
                            target: 'vscode'
                          })
                        }
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M15.07 2L6.5 3.02v17.96l8.57 1.02 7.36-4.44V6.46L15.07 2zM9.62 16.45V8.07l5.96 4.19-5.96 4.19z" />
                        </svg>
                        Install in VS Code
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>

              <CodeSurface
                code={config.config}
                copyText={config.config}
                wrapperClassName="my-0"
                onCopySuccess={() =>
                  trackInteraction(TELEMETRY_EVENTS.copyActionCompleted, {
                    label: 'copy_mcp_config',
                    location: 'mcp_setup_tabs',
                    target: config.id
                  })
                }
              />

              {config.id === 'cursor' ? (
                <p className="mt-3 text-foreground-muted text-xs">
                  Add this to <InlineCode>.cursor/mcp.json</InlineCode> in your project or global{' '}
                  <InlineCode>~/.cursor/mcp.json</InlineCode>.
                </p>
              ) : null}
              {config.id === 'claude_desktop' ? (
                <p className="mt-3 text-foreground-muted text-xs">
                  Config:{' '}
                  <InlineCode>
                    ~/Library/Application Support/Claude/claude_desktop_config.json
                  </InlineCode>{' '}
                  (macOS). Requires{' '}
                  <a
                    href="https://nodejs.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Node.js 18+
                  </a>
                  .
                </p>
              ) : null}
              {config.id === 'vscode' ? (
                <p className="mt-3 text-foreground-muted text-xs">
                  Add to User Settings (JSON) via <InlineCode>Ctrl/Cmd + Shift + P</InlineCode> →
                  &quot;Preferences: Open User Settings (JSON)&quot;, or use{' '}
                  <InlineCode>.vscode/mcp.json</InlineCode> in your workspace. Native HTTP — no
                  Node.js required.
                </p>
              ) : null}
              {config.id === 'windsurf' ? (
                <p className="mt-3 text-foreground-muted text-xs">
                  Open settings with <InlineCode>Ctrl/Cmd + ,</InlineCode> → Cascade → MCP servers.
                  Requires{' '}
                  <a
                    href="https://nodejs.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Node.js 18+
                  </a>
                  .
                </p>
              ) : null}
              {config.id === 'claude_code' ? (
                <p className="mt-3 text-foreground-muted text-xs">
                  Run <InlineCode>/mcp</InlineCode> in a Claude Code session to authenticate after
                  adding.
                </p>
              ) : null}
            </CardContent>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  )
}
