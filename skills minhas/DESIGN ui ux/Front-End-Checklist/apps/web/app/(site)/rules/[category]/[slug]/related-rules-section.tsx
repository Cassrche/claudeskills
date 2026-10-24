import { routeRule } from '@repo/config'
import { cn, formatTechTerm } from '@repo/utils'
import Link from 'next/link'
import { categoryColors } from './rule-page-support'

export interface RelatedRuleCard {
  id: string
  title: string
  slug: string
  primaryCategory: string
  description?: string
}

interface RelatedRulesSectionProps {
  relatedRules: RelatedRuleCard[]
}

/**
 * Main-column "Related rules" section with card-style links.
 * Uses stretched-link pattern: link wraps title, ::after expands to fill the card.
 */
export function RelatedRulesSection({ relatedRules }: RelatedRulesSectionProps) {
  if (relatedRules.length === 0) return null

  return (
    <section aria-labelledby="related-rules-section-heading" className="prose mt-12">
      <h2 id="related-rules-section-heading">Related rules</h2>
      <p className="mb-6! text-foreground-muted">Rules that often go hand-in-hand with this one.</p>
      <div className="mt-0! grid gap-3 sm:grid-cols-2">
        {relatedRules.map(related => (
          <div
            key={related.id}
            className={cn(
              'group relative flex flex-col gap-1.5 rounded-lg border border-border p-4',
              'bg-card transition-colors duration-200 hover:bg-background-subtle'
            )}
          >
            <div className="min-w-0 flex-1">
              <Link
                href={routeRule(related.primaryCategory, related.slug)}
                className={cn(
                  'line-clamp-2 font-medium text-foreground transition-colors group-hover:text-accent',
                  'no-underline hover:no-underline',
                  'after:absolute after:inset-0 after:content-[""]',
                  'focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring'
                )}
              >
                {related.title}
              </Link>
              {related.description && (
                <p className="mt-0.5 line-clamp-1 text-foreground-muted text-sm">
                  {related.description}
                </p>
              )}
              <span
                className={cn(
                  'mt-2 inline-flex rounded-md px-1.5 py-0.5 font-medium text-xs',
                  categoryColors[related.primaryCategory.toLowerCase()] ||
                    'bg-background-muted text-foreground-muted'
                )}
              >
                {formatTechTerm(related.primaryCategory)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
