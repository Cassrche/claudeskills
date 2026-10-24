'use client'

import { GITHUB_RULES_BLOB_URL } from '@repo/config'
import { ClaudeBrandIcon, GitHubBrandIcon } from '@repo/design-system/brand-icons'
import { Check, ChevronDown, Copy } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@repo/design-system/ui/dropdown-menu'
import { cn } from '@repo/utils'
import { useState } from 'react'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

/**
 * Cleans MDX content by removing/converting React components to plain markdown
 */
function cleanMdxContent(content: string): string {
  let cleaned = content

  // Convert <Tip>...</Tip> to blockquote
  cleaned = cleaned.replace(/<Tip>\s*([\s\S]*?)\s*<\/Tip>/g, '> **Tip:** $1')

  // Convert <Warning title="...">...</Warning> to blockquote
  cleaned = cleaned.replace(
    /<Warning\s+title="([^"]*)">\s*([\s\S]*?)\s*<\/Warning>/g,
    '> **⚠️ $1:** $2'
  )
  cleaned = cleaned.replace(/<Warning>\s*([\s\S]*?)\s*<\/Warning>/g, '> **⚠️ Warning:** $1')

  // Convert <Success title="...">...</Success> to blockquote
  cleaned = cleaned.replace(
    /<Success\s+title="([^"]*)">\s*([\s\S]*?)\s*<\/Success>/g,
    '> **✅ $1:** $2'
  )
  cleaned = cleaned.replace(/<Success>\s*([\s\S]*?)\s*<\/Success>/g, '> **✅ Success:** $1')

  // Convert <ErrorBox title="...">...</ErrorBox> to blockquote
  cleaned = cleaned.replace(
    /<ErrorBox\s+title="([^"]*)">\s*([\s\S]*?)\s*<\/ErrorBox>/g,
    '> **❌ $1:** $2'
  )
  cleaned = cleaned.replace(/<ErrorBox>\s*([\s\S]*?)\s*<\/ErrorBox>/g, '> **❌ Error:** $1')

  // Remove <CodeTabs> wrapper but keep content
  cleaned = cleaned.replace(/<CodeTabs[^>]*>\s*/g, '')
  cleaned = cleaned.replace(/\s*<\/CodeTabs>/g, '')

  // Convert <Tab value="..." label="..."> to markdown header
  cleaned = cleaned.replace(/<Tab\s+value="[^"]*"\s+label="([^"]*)">\s*/g, '\n#### $1\n\n')
  cleaned = cleaned.replace(/\s*<\/Tab>/g, '\n')

  // Remove any remaining self-closing JSX tags
  cleaned = cleaned.replace(/<[A-Z][a-zA-Z]*\s*\/>/g, '')

  // Clean up excessive newlines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  return cleaned.trim()
}

/** SVG icon for the ChatGPT logo. */
function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  )
}

interface CopyMarkdownDropdownProps {
  /** Raw markdown content to copy */
  content: string
  /** File path relative to content directory (e.g., "en/html/alt-text.mdx") */
  filePath: string
  /** Title of the rule for context when opening in AI */
  title: string
  /** Optional className for styling */
  className?: string
}

/**
 * Component for copying markdown content and opening in external services
 * Similar to Fumadocs' "Copy Markdown" and "Open" dropdown feature
 */
export function CopyMarkdownDropdown({
  content,
  filePath,
  title,
  className
}: CopyMarkdownDropdownProps) {
  const [copied, setCopied] = useState(false)

  // Clean the MDX content to remove React components
  const cleanedContent = cleanMdxContent(content)

  /**
   * Copies the cleaned rule markdown to the clipboard and shows temporary feedback.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanedContent)
      trackInteraction(TELEMETRY_EVENTS.copyActionCompleted, {
        label: 'copy_markdown',
        location: 'rule_detail',
        target: filePath
      })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  // Generate URLs for external services
  const githubUrl = `${GITHUB_RULES_BLOB_URL}/${filePath}`

  // Encode content for URL (with title prefix for context)
  const contentForAI = `# ${title}\n\n${cleanedContent}`

  // AI service URLs - truncate if too long (URL limit ~2000 chars)
  const maxLength = 1500
  const truncatedContent =
    contentForAI.length > maxLength
      ? `${contentForAI.slice(0, maxLength)}...\n\n[Content truncated. Copy the full markdown for complete content.]`
      : contentForAI
  const safeEncodedContent = encodeURIComponent(truncatedContent)

  const chatgptUrl = `https://chatgpt.com/?q=${safeEncodedContent}`
  const claudeUrl = `https://claude.ai/new?q=${safeEncodedContent}`

  return (
    <div className={cn('flex items-stretch', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className={cn(
          'rounded-r-none bg-background-subtle font-medium text-foreground-muted text-xs hover:bg-background hover:text-foreground',
          'focus-visible:z-10'
        )}
        aria-label={copied ? 'Copied!' : 'Copy Markdown'}
      >
        {copied ? (
          <Check className="size-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'rounded-l-none border-l-0 bg-background-subtle font-medium text-foreground-muted text-xs hover:bg-background hover:text-foreground',
              'focus-visible:z-10'
            )}
            aria-label="Open in external service"
          >
            <span>Open</span>
            <ChevronDown className="size-3" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem asChild className="rounded-t-lg">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackInteraction(TELEMETRY_EVENTS.externalCtaClicked, {
                  label: 'open_rule_in_github',
                  location: 'rule_detail',
                  target: githubUrl
                })
              }
            >
              <GitHubBrandIcon className="size-4" aria-hidden="true" />
              <span>Open in GitHub</span>
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <a
              href={chatgptUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackInteraction(TELEMETRY_EVENTS.externalCtaClicked, {
                  label: 'open_rule_in_chatgpt',
                  location: 'rule_detail',
                  target: 'chatgpt'
                })
              }
            >
              <ChatGPTIcon className="size-4" />
              <span>Open in ChatGPT</span>
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="rounded-b-lg">
            <a
              href={claudeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackInteraction(TELEMETRY_EVENTS.externalCtaClicked, {
                  label: 'open_rule_in_claude',
                  location: 'rule_detail',
                  target: 'claude'
                })
              }
            >
              <ClaudeBrandIcon className="size-4" />
              <span>Open in Claude</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
