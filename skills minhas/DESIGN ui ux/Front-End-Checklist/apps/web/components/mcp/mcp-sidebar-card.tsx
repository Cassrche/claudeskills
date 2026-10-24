'use client'

import { routeMcp } from '@repo/config'
import { Bot, Check, Copy, ExternalLink } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { useState } from 'react'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

interface McpSidebarCardProps {
  slug: string
  className?: string
}

interface CommandRowProps {
  command: string
  slug: string
}

/**
 * CommandRow function.
 * @param { command - { command.
 * @param slug } - slug }.
 */
function CommandRow({ command, slug }: CommandRowProps) {
  const [copied, setCopied] = useState(false)
  const fullCommand = `${command}: ${slug}`

  /**
   * handleCopy function.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCommand)
      trackInteraction(TELEMETRY_EVENTS.copyActionCompleted, {
        label: 'copy_mcp_rule_command',
        location: 'rule_detail_sidebar',
        target: command,
        ruleId: slug
      })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5',
        'bg-background-subtle hover:bg-background-muted',
        'font-mono text-foreground-muted text-xs',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      aria-label={copied ? `Copied ${fullCommand}` : `Copy ${fullCommand}`}
    >
      <span className="truncate">{fullCommand}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
    </button>
  )
}

/**
 * McpSidebarCard function.
 * @param { slug - { slug.
 * @param className } - className }.
 */
export function McpSidebarCard({ slug, className }: McpSidebarCardProps) {
  return (
    <div className={cn('border-border border-t pt-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="font-semibold text-foreground text-sm">Use with AI</h3>
      </div>

      <p className="mb-3 text-foreground-muted text-xs">Copy these MCP commands:</p>

      <div className="space-y-1.5">
        <CommandRow command="check_rule" slug={slug} />
        <CommandRow command="fix_rule" slug={slug} />
        <CommandRow command="explain_rule" slug={slug} />
      </div>

      <Link
        href={routeMcp()}
        onClick={() =>
          trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
            label: 'learn_about_mcp',
            location: 'rule_detail_sidebar',
            target: routeMcp(),
            ruleId: slug
          })
        }
        className={cn(
          'mt-3 flex items-center gap-1.5 text-accent text-xs',
          'transition-colors hover:text-accent-hover',
          'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        Learn about MCP
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  )
}
