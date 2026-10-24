'use client'

import { Check, Copy } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import { cn } from '@repo/utils'
import { useState } from 'react'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

interface Prompt {
  check?: string
  fix?: string
  explain?: string
  codeReview?: string
}

interface AIPromptsProps {
  prompts: Prompt
}

const promptConfig: Record<keyof Prompt, { label: string; description: string }> = {
  check: { label: 'Check', description: 'Verify implementation' },
  fix: { label: 'Fix', description: 'Auto-fix issues' },
  explain: { label: 'Explain', description: 'Learn more' },
  codeReview: { label: 'Review', description: 'Code review' }
}

/** Renders a single AI prompt with a copy-to-clipboard button. */
function PromptCard({ type, text }: { type: keyof Prompt; text: string }) {
  const [copied, setCopied] = useState(false)
  const config = promptConfig[type]

  /** Copies the prompt text to the clipboard and shows a brief confirmation. */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      trackInteraction(TELEMETRY_EVENTS.aiPromptCopied, {
        label: config.label,
        location: 'rule_detail',
        target: type
      })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-background p-4 shadow-sm',
        'transition-colors hover:border-border-hover'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-foreground text-sm">{config.label}</p>
          <p className="text-foreground-muted text-xs uppercase tracking-[0.18em]">
            {config.description}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={cn(
            'shrink-0 bg-background-subtle font-medium text-foreground-muted text-xs',
            'hover:bg-background hover:text-foreground'
          )}
          aria-label={`Copy ${config.label} prompt`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
      <p className="mt-4 text-foreground text-sm leading-6">{text}</p>
    </div>
  )
}

/** Displays a grid of available AI prompts (check, fix, explain, review) for a rule. */
export function AIPrompts({ prompts }: AIPromptsProps) {
  const availablePrompts = Object.entries(prompts).filter(
    ([_, value]) => value !== undefined && value !== ''
  ) as [keyof Prompt, string][]

  if (availablePrompts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {availablePrompts.map(([key, value]) => (
        <PromptCard key={key} type={key} text={value} />
      ))}
    </div>
  )
}
