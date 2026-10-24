'use client'

import { XBrandIcon, YouTubeBrandIcon } from '@repo/design-system/brand-icons'
import { FileText } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import type { Mention, MentionType } from '@repo/types'
import { useState } from 'react'
import {
  ArticleEmbed,
  TweetEmbed,
  YouTubeEmbedCard
} from '@/components/mentions/embeds/mention-embeds'

interface MentionsBrowserProps {
  mentions: Mention[]
}

/**
 * MentionCard function.
 * @param { mention } - { mention }.
 */
function MentionCard({ mention }: { mention: Mention }) {
  switch (mention.type) {
    case 'article':
      return <ArticleEmbed mention={mention} />
    case 'tweet':
      return <TweetEmbed mention={mention} />
    case 'youtube':
      return <YouTubeEmbedCard mention={mention} />
    default:
      return null
  }
}

type FilterType = 'all' | MentionType

const filterTabs: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: null },
  { value: 'article', label: 'Articles', icon: <FileText className="size-4" /> },
  { value: 'tweet', label: 'X', icon: <XBrandIcon className="size-4" /> },
  { value: 'youtube', label: 'Videos', icon: <YouTubeBrandIcon className="size-4" /> }
]

/**
 * MentionsBrowser function.
 * @param { mentions } - { mentions }.
 */
export function MentionsBrowser({ mentions }: MentionsBrowserProps) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredMentions = filter === 'all' ? mentions : mentions.filter(m => m.type === filter)

  // Sort by date (newest first)
  const sortedMentions = filteredMentions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <>
      {/* Filter Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map(tab => (
            <Button
              key={tab.value}
              variant={filter === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(tab.value)}
              className="gap-2"
            >
              {tab.icon}
              {tab.label}
              <span className="ml-1 text-xs opacity-80">
                (
                {tab.value === 'all'
                  ? mentions.length
                  : mentions.filter(m => m.type === tab.value).length}
                )
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Mentions Grid - Masonry layout for variable height items */}
      {sortedMentions.length > 0 ? (
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {sortedMentions.map(mention => (
            <div key={mention.id} className="mb-6 break-inside-avoid">
              <MentionCard mention={mention} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-foreground-muted">No mentions found for this filter.</p>
        </div>
      )}
    </>
  )
}
