'use client'

import { XBrandIcon } from '@repo/design-system/brand-icons'
import { Check, ChevronDown, Link2, Share2 } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@repo/design-system/ui/dropdown-menu'
import { cn } from '@repo/utils'
import { useCallback, useEffect, useState } from 'react'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

/** LinkedIn brand icon for share menu. */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

/** Reddit brand icon for share menu. */
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M373 138.6c-25.2 0-46.3-17.5-51.9-41l0 0c-30.6 4.3-54.2 30.7-54.2 62.4l0 .2c47.4 1.8 90.6 15.1 124.9 36.3c12.6-9.7 28.4-15.5 45.5-15.5c41.3 0 74.7 33.4 74.7 74.7c0 29.8-17.4 55.5-42.7 67.5c-2.4 86.8-97 156.6-213.2 156.6S45.5 410.1 43 323.4C17.6 311.5 0 285.7 0 255.7c0-41.3 33.4-74.7 74.7-74.7c17.2 0 33 5.8 45.7 15.6c34-21.1 76.8-34.4 123.7-36.4l0-.3c0-44.3 33.7-80.9 76.8-85.5C325.8 50.2 347.2 32 373 32c29.4 0 53.3 23.9 53.3 53.3s-23.9 53.3-53.3 53.3zM157.5 255.3c-20.9 0-38.9 20.8-40.2 47.9s17.1 38.1 38 38.1s36.6-9.8 37.8-36.9s-14.7-49.1-35.7-49.1zM395 303.1c-1.2-27.1-19.2-47.9-40.2-47.9s-36.9 22-35.7 49.1c1.2 27.1 16.9 36.9 37.8 36.9s39.3-11 38-38.1zm-60.1 70.8c1.5-3.6-1-7.7-4.9-8.1c-23-2.3-47.9-3.6-73.8-3.6s-50.8 1.3-73.8 3.6c-3.9 .4-6.4 4.5-4.9 8.1c12.9 30.8 43.3 52.4 78.7 52.4s65.8-21.6 78.7-52.4z" />
    </svg>
  )
}

interface ShareButtonProps {
  /** Page or content title used in share text. */
  title: string
  /** URL to share; defaults to current window location. */
  url?: string
  /** Optional class name for the trigger wrapper. */
  className?: string
  /** Analytics location for the share control. */
  location?: string
}

/**
 * native Web Share API when available. Matches CopyMarkdownDropdown styling.
 */
export function ShareButton({ title, url, className, location = 'page_header' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setCanNativeShare('share' in navigator)
  }, [])

  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title)

  const handleCopy = useCallback(
    async (e: Event) => {
      e.preventDefault()
      try {
        await navigator.clipboard.writeText(shareUrl)
        trackInteraction(TELEMETRY_EVENTS.copyActionCompleted, {
          label: 'copy_share_link',
          location,
          target: shareUrl
        })
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setCopied(false)
      }
    },
    [location, shareUrl]
  )

  const handleNativeShare = useCallback(
    async (e: Event) => {
      e.preventDefault()
      if (!navigator.share) return
      try {
        trackInteraction(TELEMETRY_EVENTS.shareActionClicked, {
          label: 'native_share',
          location,
          target: shareUrl
        })
        await navigator.share({
          title,
          url: shareUrl
        })
      } catch (err) {
        if (!(err instanceof Error) || err.name === 'AbortError') return
      }
    },
    [location, title, shareUrl]
  )

  /** Record that the share menu trigger was opened. */
  const handleShareTriggerClick = () => {
    trackInteraction(TELEMETRY_EVENTS.shareActionClicked, {
      label: 'open_share_menu',
      location,
      target: shareUrl
    })
  }

  /** Record a click on one of the external share destinations. */
  const trackShareDestination = (label: string, target: string) => {
    trackInteraction(TELEMETRY_EVENTS.shareActionClicked, {
      label,
      location,
      target
    })
  }

  const xIntentUrl = `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  const redditUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'bg-background-subtle font-medium text-foreground-muted text-xs hover:bg-background hover:text-foreground',
            className
          )}
          aria-label="Share"
          onClick={handleShareTriggerClick}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          ) : (
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{copied ? 'Copied!' : 'Share'}</span>
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[200px]">
        <DropdownMenuItem className="rounded-t-lg" onSelect={handleCopy}>
          <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Copy link</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href={xIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackShareDestination('share_on_x', xIntentUrl)}
          >
            <XBrandIcon className="h-4 w-4 shrink-0" />
            <span>Share on X</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackShareDestination('share_on_linkedin', linkedInUrl)}
          >
            <LinkedInIcon className="h-4 w-4 shrink-0" />
            <span>Share on LinkedIn</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className={cn(!canNativeShare && 'rounded-b-lg')}>
          <a
            href={redditUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackShareDestination('share_on_reddit', redditUrl)}
          >
            <RedditIcon className="h-4 w-4 shrink-0" />
            <span>Share on Reddit</span>
          </a>
        </DropdownMenuItem>

        {canNativeShare ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-b-lg" onSelect={handleNativeShare}>
              <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Native Share…</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
