'use client'

import { SOCIAL } from '@repo/config'
import { XBrandIcon } from '@repo/design-system/brand-icons'
import { cn } from '@repo/utils'
import Link from 'next/link'

/**
 * Renders the external social link to the project's X profile.
 * @returns A button-styled external link to X.
 */
export function XLink() {
  return (
    <Link
      href={SOCIAL.x}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'flex h-9 items-center rounded-md px-2.5',
        'text-foreground-muted',
        'hover:bg-background-subtle hover:text-foreground',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      aria-label="Follow on X"
    >
      <XBrandIcon className="h-4 w-4" />
    </Link>
  )
}
