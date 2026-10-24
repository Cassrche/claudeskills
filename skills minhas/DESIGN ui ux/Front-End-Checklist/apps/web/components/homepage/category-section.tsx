import { routeRules } from '@repo/config'
import { ChevronRight, Layers } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { PUBLIC_RULE_COUNT_LABEL } from '@/components/homepage/rule-count-display'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { CategoryCard, type CategoryIconName } from './category-card'

export interface CategorySummary {
  slug: string
  title: string
  description: string
  ruleIds: string[]
  iconName: CategoryIconName
}

interface CategorySectionProps {
  categories: CategorySummary[]
}

/**
 * Render the homepage category browser section.
 * @param props - Category summaries shown as cards.
 */
export function CategorySection({ categories }: CategorySectionProps) {
  return (
    <section
      aria-labelledby="categories-heading"
      className="bg-linear-to-b from-background to-background-subtle/30 py-16 sm:py-20 lg:py-24"
    >
      <div className="container-content">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Layers className="size-5 text-accent" />
              <span className="font-medium text-accent text-sm uppercase tracking-wider">
                Categories
              </span>
            </div>
            <h2
              id="categories-heading"
              className="font-heading font-semibold text-3xl text-foreground"
            >
              Browse by Category
            </h2>
            <p className="mt-2 text-foreground-muted">
              Use curated checklists when you want a guided path, or explore {categories.length}{' '}
              categories with {PUBLIC_RULE_COUNT_LABEL} rules when you already know the area you
              need
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden gap-1.5 sm:flex">
            <TrackedLink
              href={routeRules()}
              telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
              telemetryProperties={{
                label: 'view_all_rules',
                location: 'homepage_categories'
              }}
            >
              View all rules
              <ChevronRight className="size-4" />
            </TrackedLink>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(category => (
            <CategoryCard
              key={category.slug}
              slug={category.slug}
              title={category.title}
              description={category.description}
              ruleIds={category.ruleIds}
              iconName={category.iconName}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
