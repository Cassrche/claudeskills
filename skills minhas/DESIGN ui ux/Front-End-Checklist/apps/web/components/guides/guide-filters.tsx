import { routeGuides } from '@repo/config'
import { cn, formatTechTerm } from '@repo/utils'
import Link from 'next/link'

interface GuideFiltersProps {
  categories: string[]
  tags: string[]
  selectedCategory?: string
  selectedTag?: string
  selectedType?: string
}

/**
 * Build a guides index URL with the active filter query params.
 *
 * @param params - Selected filter values.
 * @returns Guides route with serialized query params when applicable.
 */
function buildFilterHref({
  category,
  tag,
  type
}: {
  category?: string
  tag?: string
  type?: string
}) {
  const params = new URLSearchParams()

  if (category) params.set('category', category)
  if (tag) params.set('tag', tag)
  if (type) params.set('type', type)

  const query = params.toString()

  return query ? `${routeGuides()}?${query}` : routeGuides()
}

/**
 * Render a single guide filter link pill.
 *
 * @param props - Filter pill props.
 * @returns Link pill for a single filter option.
 */
function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex rounded-full border px-3 py-1.5 font-medium text-sm transition-colors',
        active
          ? 'border-accent bg-accent text-accent-foreground'
          : 'border-border bg-background-subtle text-foreground-muted hover:border-border-hover hover:bg-background hover:text-foreground'
      )}
    >
      {label}
    </Link>
  )
}

/**
 * Render server-side filter links for the guides hub.
 */
export function GuideFilters({
  categories,
  tags,
  selectedCategory,
  selectedTag,
  selectedType
}: GuideFiltersProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="font-medium text-foreground text-sm">Type</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterPill
            href={buildFilterHref({ category: selectedCategory, tag: selectedTag })}
            active={!selectedType}
            label="All"
          />
          <FilterPill
            href={buildFilterHref({ category: selectedCategory, tag: selectedTag, type: 'how-to' })}
            active={selectedType === 'how-to'}
            label="Guide"
          />
          <FilterPill
            href={buildFilterHref({
              category: selectedCategory,
              tag: selectedTag,
              type: 'insight'
            })}
            active={selectedType === 'insight'}
            label="Insight"
          />
        </div>
      </div>

      <div>
        <h2 className="font-medium text-foreground text-sm">Category</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterPill
            href={buildFilterHref({ tag: selectedTag, type: selectedType })}
            active={!selectedCategory}
            label="All"
          />
          {categories.map(category => (
            <FilterPill
              key={category}
              href={buildFilterHref({ category, tag: selectedTag, type: selectedType })}
              active={selectedCategory === category}
              label={formatTechTerm(category)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-medium text-foreground text-sm">Tags</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterPill
            href={buildFilterHref({ category: selectedCategory, type: selectedType })}
            active={!selectedTag}
            label="All"
          />
          {tags.map(tag => (
            <FilterPill
              key={tag}
              href={buildFilterHref({ category: selectedCategory, tag, type: selectedType })}
              active={selectedTag === tag}
              label={tag}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
