'use client'

import { Bot, ChevronDown } from '@repo/design-system/icons'
import { useAppStore } from '@repo/state'
import { cn } from '@repo/utils'
import { SkillInstallBox } from './skill-install-box'

interface UseWithAiDisclosureProps {
  aiHref: string
  hasPrompts: boolean
  slug: string
}

/**
 * Expandable disclosure that links rule pages to AI installation and prompt usage.
 *
 * @param props - Disclosure content and destination props.
 */
export function UseWithAiDisclosure({ aiHref, hasPrompts, slug }: UseWithAiDisclosureProps) {
  const isOpen = useAppStore(state => state.useWithAiOpen)
  const setUseWithAiOpen = useAppStore(state => state.setUseWithAiOpen)

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-border bg-background/85 shadow-sm',
        isOpen && 'bg-background'
      )}
    >
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between gap-4 px-4 py-3 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
        aria-expanded={isOpen}
        aria-controls={`use-with-ai-panel-${slug}`}
        onClick={() => setUseWithAiOpen(!isOpen)}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-xl border border-border bg-background-subtle p-2 text-accent">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-foreground text-sm">Use with AI</span>
            <span className="mt-1 block text-foreground-muted text-sm leading-6">
              Install this rule as a skill and jump to prompts when you need them.
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 text-foreground-muted transition-transform',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div id={`use-with-ai-panel-${slug}`} className="border-border border-t px-4 py-4">
          <p className="mb-3 text-foreground-muted text-sm leading-6">
            Copy the install command for this rule, then use the full prompt set below.
          </p>
          <SkillInstallBox slug={slug} />
          <a
            href={aiHref}
            className="mt-3 inline-flex font-medium text-accent text-sm transition-colors hover:text-accent-hover"
          >
            {hasPrompts ? 'View AI prompts' : 'Learn about MCP'}
          </a>
        </div>
      ) : null}
    </div>
  )
}
