import { routeGuideDetail } from '@repo/config'
import { Clock3 } from '@repo/design-system/icons'
import { Card, CardContent } from '@repo/design-system/ui/card'
import { cn, formatTechTerm } from '@repo/utils'
import Image from 'next/image'
import Link from 'next/link'

interface GuideCardProps {
  guide: {
    slug: string
    title: string
    description: string
    type: 'how-to' | 'insight'
    category: string
    tags: string[]
    updatedAt: string
    coverImage: string
    author: {
      name: string
    }
  }
  priority?: 'featured' | 'default'
}

/**
 * Format an ISO date string for guide card metadata.
 *
 * @param value - ISO date string.
 * @returns Human-readable short date.
 */
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value))
}

/**
 * Convert a guide type into the badge label shown on the card.
 *
 * @param type - Guide type value.
 * @returns Display label for the guide card badge.
 */
function formatGuideTypeLabel(type: GuideCardProps['guide']['type']) {
  return type === 'how-to' ? 'Guide' : 'Insight'
}

/**
 * Renders a guide preview card with a stretched-link title.
 */
export function GuideCard({ guide, priority = 'default' }: GuideCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border bg-card">
      <div
        className={cn(
          'relative overflow-hidden border-border border-b',
          priority === 'featured' ? 'aspect-[16/9]' : 'aspect-[16/8]'
        )}
      >
        <Image
          src={guide.coverImage}
          alt=""
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes={
            priority === 'featured'
              ? '(min-width: 1024px) 50vw, 100vw'
              : '(min-width: 1024px) 33vw, 100vw'
          }
        />
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-border bg-background-subtle px-2.5 py-1 font-medium text-[11px] text-foreground-subtle uppercase tracking-[0.16em]">
            {formatGuideTypeLabel(guide.type)}
          </span>
          <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 font-medium text-[11px] text-foreground-muted">
            {formatTechTerm(guide.category)}
          </span>
        </div>

        <div>
          <h3
            className={cn(
              'font-semibold text-foreground tracking-tight',
              priority === 'featured' ? 'text-2xl' : 'text-xl'
            )}
          >
            <Link
              href={routeGuideDetail(guide.slug)}
              className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {guide.title}
            </Link>
          </h3>
          <p className="mt-3 text-foreground-muted leading-relaxed">{guide.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-foreground-muted text-sm">
          <span>{guide.author.name}</span>
          <span aria-hidden="true">/</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Updated {formatDate(guide.updatedAt)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {guide.tags.slice(0, priority === 'featured' ? 4 : 3).map(tag => (
            <span
              key={tag}
              className="rounded-full bg-background-subtle px-2.5 py-1 text-[12px] text-foreground-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
