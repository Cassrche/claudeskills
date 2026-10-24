'use client'

import { routeRulesCategory } from '@repo/config'
import {
  ArrowRight,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Square
} from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { useCallback, useMemo } from 'react'
import { RuleRowSkeleton } from '@/components/rules/listing/rule-row'
import { useProgress } from '@/hooks/use-progress'

const defaultSubcategoryDescriptions: Record<string, string> = {
  general: 'Core rules and fundamentals that apply across your project.',
  validation: 'Ensure your code meets standards and passes validation checks.',
  semantics: 'Use meaningful markup that improves accessibility and SEO.',
  'document-structure':
    'Organize markup and semantics so structure is clear to browsers and assistive tech.',
  'meta-tags': 'Configure metadata for search engines and social sharing.',
  performance: 'Optimize for speed and efficient resource loading.',
  accessibility: 'Make your content usable by everyone.',
  security: 'Protect your users and application from vulnerabilities.',
  forms: 'Build accessible, user-friendly form experiences.',
  images: 'Optimize images for performance and accessibility.',
  typography: 'Ensure readable, well-structured text content.',
  layout: 'Create responsive, well-organized page structures.',
  animation: 'Add motion that enhances without harming usability.',
  aria: 'Use ARIA intentionally and only where native semantics are not enough.',
  'best-practices': 'Capture implementation standards, tooling, and maintainability guidance.',
  'design-tokens': 'Use shared CSS values and theming primitives consistently.',
  keyboard: 'Ensure features remain efficient and predictable for keyboard users.',
  metrics: 'Measure runtime behavior and use those signals to guide optimization work.',
  'screen-readers':
    'Validate and improve how assistive technologies announce and navigate content.',
  'web-vitals': 'Focus on Core Web Vitals and closely related user-facing performance signals.',
  privacy: 'Protect user data, consent flows, and privacy-sensitive browser behavior.',
  mobile: 'Cover mobile-specific interaction, viewport, and device validation.',
  visual: 'Address visual perception, contrast, zoom, and visible affordances.'
}

/** Subcategory slugs that need a custom display label (e.g. acronyms). Add here to scale. */
const SUBCATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  aria: 'ARIA'
}

/**
 * Convert a slug-style subcategory into a readable label.
 * @param label - Raw subcategory slug.
 * @returns Human-readable label text.
 */
function formatSubcategoryLabel(label: string): string {
  const normalized = label.toLowerCase().trim()
  const override = SUBCATEGORY_LABEL_OVERRIDES[normalized]
  if (override !== undefined) return override
  return label
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface CategoryHeaderProps {
  category: string
  isFirst?: boolean
  enableLink?: boolean
}

/**
 * Render a category heading, optionally linking to the category landing page.
 * @param props - Category header display props.
 */
export function CategoryHeader({
  category,
  isFirst = false,
  enableLink = false
}: CategoryHeaderProps) {
  const content = (
    <h2
      className={cn(
        'font-medium text-4xl text-foreground capitalize',
        enableLink && 'transition-colors duration-150 group-hover:text-accent'
      )}
    >
      {category}
      {enableLink ? (
        <ArrowRight
          className="ml-3 inline-block h-6 w-6 text-foreground-muted transition-all duration-150 group-hover:translate-x-1 group-hover:text-accent"
          aria-hidden="true"
        />
      ) : null}
    </h2>
  )

  if (enableLink) {
    return (
      <div id={category} className={cn('mb-8 scroll-mt-24', isFirst ? 'mt-8' : 'mt-24')}>
        <Link
          href={routeRulesCategory(category)}
          className="group inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {content}
        </Link>
      </div>
    )
  }

  return (
    <div id={category} className={cn('mb-8 scroll-mt-24', isFirst ? 'mt-8' : 'mt-24')}>
      {content}
    </div>
  )
}

interface SubcategoryHeaderProps {
  label: string
  description?: string
  ruleIds: string[]
  isFirst?: boolean
  allExpanded?: boolean
  onExpandAll?: () => void
  onCollapseAll?: () => void
  allChecked?: boolean
  onCheckAll?: () => void
  onUncheckAll?: () => void
}

/**
 * Render a sticky subcategory heading with completion and bulk actions.
 * @param props - Subcategory header props.
 */
export function SubcategoryHeader({
  label,
  description,
  ruleIds,
  isFirst = false,
  allExpanded,
  onExpandAll,
  onCollapseAll,
  allChecked,
  onCheckAll,
  onUncheckAll
}: SubcategoryHeaderProps) {
  const { getCompletionStats } = useProgress()
  const stats = useMemo(() => getCompletionStats(ruleIds), [ruleIds, getCompletionStats])
  const isComplete = stats.completed === stats.total && stats.total > 0
  const displayDescription =
    description || defaultSubcategoryDescriptions[label.toLowerCase()] || ''

  const handleExpandToggle = useCallback(() => {
    if (allExpanded) {
      onCollapseAll?.()
    } else {
      onExpandAll?.()
    }
  }, [allExpanded, onExpandAll, onCollapseAll])

  const handleCheckToggle = useCallback(() => {
    if (allChecked) {
      onUncheckAll?.()
    } else {
      onCheckAll?.()
    }
  }, [allChecked, onCheckAll, onUncheckAll])

  return (
    <div
      className={cn(
        'sticky top-0 z-10',
        'bg-background/80 backdrop-blur-sm',
        '-mx-4 px-4 py-4 sm:-mx-6 sm:px-6',
        isFirst ? 'mt-6' : 'mt-16'
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="font-medium text-4xl text-foreground">{formatSubcategoryLabel(label)}</h3>
          {displayDescription ? (
            <p className="mt-1.5 text-foreground-muted text-sm leading-relaxed">
              {displayDescription}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {onExpandAll || onCollapseAll ? (
            <button
              type="button"
              onClick={handleExpandToggle}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1',
                'text-foreground-muted text-xs hover:text-foreground',
                'hover:bg-foreground/10',
                'transition-colors duration-150'
              )}
              aria-label={
                allExpanded
                  ? 'Collapse all rules in this section'
                  : 'Expand all rules in this section'
              }
            >
              {allExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </button>
          ) : null}
          {onCheckAll || onUncheckAll ? (
            <button
              type="button"
              onClick={handleCheckToggle}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1',
                'text-foreground-muted text-xs hover:text-foreground',
                'hover:bg-foreground/10',
                'transition-colors duration-150'
              )}
              aria-label={
                allChecked ? 'Uncheck all rules in this section' : 'Check all rules in this section'
              }
            >
              {allChecked ? (
                <>
                  <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Uncheck</span>
                </>
              ) : (
                <>
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Check</span>
                </>
              )}
            </button>
          ) : null}
          <span
            className={cn(
              'shrink-0 text-sm uppercase tracking-wide',
              isComplete ? 'text-accent' : 'text-foreground-muted'
            )}
          >
            {isComplete ? <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> : null}
            <span className="tabular-nums">
              {stats.completed}/{stats.total}
            </span>
            <span className="ml-1">checked</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Render the loading state for the rules browser.
 * @param props - Skeleton display options.
 */
export function RulesBrowserSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 max-w-sm flex-1 animate-pulse rounded-md bg-foreground/10" />
        <div className="h-9 w-20 animate-pulse rounded-md bg-foreground/10" />
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <RuleRowSkeleton key={`skeleton-${count}-${i}`} />
        ))}
      </div>
    </div>
  )
}
