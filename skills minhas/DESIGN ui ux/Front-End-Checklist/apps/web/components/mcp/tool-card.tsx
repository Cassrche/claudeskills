'use client'

import { CodeSurface, InlineCode } from '@repo/design-system/custom/content/code-surface'
import type { LucideIcon } from '@repo/design-system/icons'
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Globe,
  List,
  Search,
  Sparkles,
  Terminal,
  Workflow,
  Wrench
} from '@repo/design-system/icons'
import { Card, CardContent } from '@repo/design-system/ui/card'
import { cn } from '@repo/utils'
import { useState } from 'react'

// Icon mapping for serialization across Server/Client boundary
const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Sparkles,
  FileText,
  Search,
  ClipboardList,
  ClipboardCheck,
  Wrench,
  BookOpen,
  List,
  Workflow,
  Terminal
}

interface ToolParameter {
  name: string
  type: string
  required: boolean
  description: string
}

interface McpTool {
  name: string
  title: string
  icon: string
  description: string
  useCase: string
  parameters: ToolParameter[]
  example: string
}

interface ToolCardProps {
  tool: McpTool
}

/**
 * ToolCard function.
 * @param { tool } - { tool }.
 */
export function ToolCard({ tool }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = ICON_MAP[tool.icon] || FileText

  return (
    <Card emphasis={expanded ? 'accent' : 'default'}>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full cursor-pointer items-start gap-4 rounded-lg p-5 text-left transition-colors hover:bg-background-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${tool.title} details` : `Expand ${tool.title} details`}
        >
          <div className="shrink-0 rounded-md bg-accent/10 p-2">
            <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0 grow">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-foreground text-sm">{tool.title}</h3>
              <InlineCode>{tool.name}</InlineCode>
              {tool.name === 'review_code' && (
                <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-[10px] text-accent">
                  RECOMMENDED
                </span>
              )}
            </div>
            <p className="mt-1 text-foreground-muted text-sm">{tool.description}</p>
            <p className="mt-2 text-accent text-xs">{tool.useCase}</p>
          </div>
          <ChevronRight
            className={cn(
              'mt-1 h-4 w-4 shrink-0 text-foreground-muted transition-transform',
              expanded && 'rotate-90'
            )}
          />
        </button>

        {expanded && (
          <div className="border-border border-t px-5 pb-5">
            {/* Parameters */}
            {tool.parameters.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 font-medium text-foreground-muted text-xs uppercase tracking-wide">
                  Parameters
                </h4>
                <div className="space-y-2">
                  {tool.parameters.map(param => (
                    <div key={param.name} className="flex items-start gap-2 text-sm">
                      <InlineCode>{param.name}</InlineCode>
                      <span className="text-foreground-muted text-xs">{param.type}</span>
                      {param.required && <span className="text-destructive text-xs">required</span>}
                      <span className="grow text-foreground-muted text-xs">
                        {param.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Example */}
            <div className="mt-4">
              <h4 className="mb-2 font-medium text-foreground-muted text-xs uppercase tracking-wide">
                Example
              </h4>
              <CodeSurface code={tool.example} copyText={tool.example} wrapperClassName="my-0" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
