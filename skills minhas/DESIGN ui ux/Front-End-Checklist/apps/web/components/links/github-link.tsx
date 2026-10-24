'use client'

import { SiGithub } from '@icons-pack/react-simple-icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { formatGitHubStars, GITHUB_REPOSITORY_URL } from '@/lib/github'

interface GitHubLinkProps {
  starsCount: number | null
}

/**
 * GitHubLink function.
 * @param { starsCount } - { starsCount }.
 */
export function GitHubLink({ starsCount }: GitHubLinkProps) {
  return (
    <Link
      href={GITHUB_REPOSITORY_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'flex h-9 items-center gap-2 rounded-md px-2.5',
        'text-foreground-muted',
        'hover:bg-background-subtle hover:text-foreground',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      aria-label="View on GitHub"
    >
      <SiGithub size={16} aria-hidden="true" />
      <span className="max-sm:sr-only">
        <StarsCount starsCount={starsCount} />
      </span>
    </Link>
  )
}

/**
 * StarsCount function.
 * @param { starsCount } - { starsCount }.
 */
function StarsCount({ starsCount }: GitHubLinkProps) {
  if (starsCount === null) {
    return <span className="h-4 w-8" />
  }

  return (
    <span className="text-foreground-muted text-xs tabular-nums">
      {formatGitHubStars(starsCount, '0')}
    </span>
  )
}
