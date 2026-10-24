'use client'

import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Headphones,
  Play,
  Wrench
} from '@repo/design-system/icons'
import type { ResourceType, RuleResource } from '@repo/types'
import { cn } from '@repo/utils'

// Resource type configuration
const resourceTypeConfig: Record<
  ResourceType,
  { icon: typeof Wrench; label: string; color: string; bg: string }
> = {
  tool: {
    icon: Wrench,
    label: 'Tool',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30'
  },
  article: {
    icon: FileText,
    label: 'Article',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30'
  },
  book: {
    icon: BookOpen,
    label: 'Book',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30'
  },
  video: {
    icon: Play,
    label: 'Video',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30'
  },
  documentation: {
    icon: FileText,
    label: 'Docs',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30'
  },
  guide: {
    icon: FileText,
    label: 'Guide',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30'
  },
  spec: {
    icon: BookOpen,
    label: 'Spec',
    color: 'text-foreground-muted',
    bg: 'bg-background-muted'
  },
  course: {
    icon: GraduationCap,
    label: 'Course',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30'
  },
  podcast: {
    icon: Headphones,
    label: 'Podcast',
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-950/30'
  }
}

// Re-export for convenience
export type { ResourceType, RuleResource }

interface ResourceCardProps {
  resource: RuleResource
  className?: string
}

/**
 * Extract domain from URL for display
 */
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return url
  }
}

/**
 * Google's favicon service — use for Notion-style domain favicon in link cards.
 * sz can be 16, 32, 48, 64, 128. Prefer 32 for small UI.
 */
function getFaviconUrl(domain: string, size = 32): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}

/**
 * Individual resource card — Notion-style link preview.
 * Uses stretched-link pattern: link wraps title, ::after expands to fill the card.
 */
export function ResourceCard({ resource, className }: ResourceCardProps) {
  const config = resourceTypeConfig[resource.type]
  const domain = extractDomain(resource.url)
  const displaySite = resource.siteName || domain
  const hasImage = Boolean(resource.image)

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border',
        'bg-card shadow-sm transition-all duration-200 hover:bg-background-subtle hover:shadow-md',
        className
      )}
    >
      {hasImage && (
        <div className="aspect-2/1 w-full overflow-hidden bg-muted">
          <img
            src={resource.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80">
            <img
              src={getFaviconUrl(domain)}
              alt=""
              className="h-5 w-5 rounded"
              width={20}
              height={20}
              loading="lazy"
            />
          </div>

          <div className="min-w-0 flex-1">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'line-clamp-2 block font-medium text-foreground transition-colors group-hover:text-accent',
                'no-underline hover:no-underline',
                'after:absolute after:inset-0 after:content-[""]',
                'focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring'
              )}
            >
              {resource.name}
            </a>
            {(resource.author || resource.description) && (
              <p className="mt-0.5 line-clamp-2 text-foreground-muted text-sm">
                {resource.author ? `by ${resource.author}` : resource.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="truncate text-foreground-muted text-xs">{displaySite}</span>
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-medium text-xs',
                  config.bg,
                  config.color
                )}
              >
                {config.label}
              </span>
            </div>
          </div>

          <ExternalLink
            className="mt-1 h-3.5 w-3.5 shrink-0 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}

interface ResourceGridProps {
  resources: RuleResource[]
  className?: string
}

/**
 * Grid of resource cards
 */
export function ResourceGrid({ resources, className }: ResourceGridProps) {
  if (!resources || resources.length === 0) return null

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {resources.map(resource => (
        <ResourceCard key={`${resource.type}-${resource.url}`} resource={resource} />
      ))}
    </div>
  )
}

interface ToolCardProps {
  name: string
  url: string
  className?: string
}

/**
 * Tool card — same Notion-style link preview as ResourceCard.
 * Uses stretched-link pattern: link wraps title, ::after expands to fill the card.
 */
export function ToolCard({ name, url, className }: ToolCardProps) {
  const domain = extractDomain(url)

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border',
        'bg-card shadow-sm transition-all duration-200 hover:bg-background-subtle hover:shadow-md',
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80">
            <img
              src={getFaviconUrl(domain)}
              alt=""
              className="h-5 w-5 rounded"
              width={20}
              height={20}
              loading="lazy"
            />
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'line-clamp-2 block font-medium text-foreground transition-colors group-hover:text-accent',
                'no-underline hover:no-underline',
                'after:absolute after:inset-0 after:content-[""]',
                'focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring'
              )}
            >
              {name}
            </a>
            <span className="mt-1 block text-foreground-muted text-xs">{domain}</span>
            <span className="mt-2 inline-flex rounded-md bg-blue-50 px-1.5 py-0.5 font-medium text-blue-600 text-xs dark:bg-blue-950/30 dark:text-blue-400">
              Tool
            </span>
          </div>
          <ExternalLink
            className="mt-1 h-3.5 w-3.5 shrink-0 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}

interface ToolGridProps {
  tools: { name: string; url: string | null }[]
  className?: string
}

/**
 * Grid of tool cards for legacy tools format
 */
export function ToolGrid({ tools, className }: ToolGridProps) {
  const toolsWithUrls = tools.filter(
    (tool): tool is { name: string; url: string } => tool.url !== null
  )

  if (toolsWithUrls.length === 0) return null

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {toolsWithUrls.map(tool => (
        <ToolCard key={tool.name} name={tool.name} url={tool.url} />
      ))}
    </div>
  )
}
