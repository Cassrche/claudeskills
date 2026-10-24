import { Card, CardContent } from '@repo/design-system/ui/card'
import { formatTechTerm } from '@repo/utils'
import Image from 'next/image'
import { PageHero } from '@/components/content/page/page-hero'
import { ShareButton } from '@/components/rules/detail/share-button'
import { TableOfContents } from '@/components/rules/detail/table-of-contents'
import { formatGuideDate, formatGuideTypeLabel, type RelatedLink } from './guide-link-builders'
import { RelatedCard } from './guide-related-card'

interface GuideHeaderProps {
  guide: {
    title: string
    description: string
    type: 'how-to' | 'insight'
    category: string
    tags: string[]
    publishedAt: string
    updatedAt: string
    coverImage: string
    author: {
      name: string
      role?: string
      bio?: string
      url?: string
    }
  }
}

/**
 * Renders the hero section for a guide detail page.
 */
export function GuideHeader({ guide }: GuideHeaderProps) {
  return (
    <PageHero
      eyebrow={
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-background-subtle px-2.5 py-1 font-medium text-[11px] text-foreground-subtle uppercase tracking-[0.16em]">
            {formatGuideTypeLabel(guide.type)}
          </span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 font-medium text-[11px] text-foreground-muted">
            {formatTechTerm(guide.category)}
          </span>
        </div>
      }
      title={guide.title}
      description={guide.description}
      actions={<ShareButton title={guide.title} />}
    >
      <div className="flex flex-wrap items-center gap-3 text-foreground-muted text-sm">
        <span>{guide.author.name}</span>
        <span aria-hidden="true">/</span>
        <span>Published {formatGuideDate(guide.publishedAt)}</span>
        <span aria-hidden="true">/</span>
        <span>Updated {formatGuideDate(guide.updatedAt)}</span>
      </div>
      <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl border border-border">
        <Image
          src={guide.coverImage}
          alt=""
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 900px, 100vw"
        />
      </div>
    </PageHero>
  )
}

interface GuideSidebarProps {
  author: {
    name: string
    role?: string
    bio?: string
    url?: string
  }
}

/**
 * Renders the sticky sidebar for guide detail pages.
 */
export function GuideSidebar({ author }: GuideSidebarProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <Card>
        <CardContent className="p-5">
          <TableOfContents contentSelector="[data-guide-content]" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-medium text-foreground text-sm">Written by</h2>
          {author.url ? (
            <a
              href={author.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-accent"
            >
              {author.name}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ) : (
            <p className="font-semibold text-foreground">{author.name}</p>
          )}
          {author.role ? <p className="text-foreground-muted text-sm">{author.role}</p> : null}
          {author.bio ? (
            <p className="text-foreground-muted text-sm leading-relaxed">{author.bio}</p>
          ) : null}
        </CardContent>
      </Card>
    </aside>
  )
}

interface GuideRelatedSectionProps {
  heading: string
  items: RelatedLink[]
}

/**
 * Renders a guide related-content section when there are items to show.
 */
export function GuideRelatedSection({ heading, items }: GuideRelatedSectionProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-semibold text-2xl text-foreground">{heading}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => (
          <RelatedCard key={`${item.meta}-${item.href}`} item={item} />
        ))}
      </div>
    </section>
  )
}
