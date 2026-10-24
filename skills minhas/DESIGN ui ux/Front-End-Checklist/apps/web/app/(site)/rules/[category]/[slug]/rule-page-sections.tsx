import { routeMcp, routeRule } from '@repo/config'
import {
  RuleCategoryChips,
  RuleQuickTakeCard
} from '@/app/(site)/rules/[category]/[slug]/rule-page-support'
import { RuleCheckbox } from '@/components/rules/controls/rule-checkbox'
import { CopyMarkdownDropdown } from '@/components/rules/detail/copy-markdown-dropdown'
import { ShareButton } from '@/components/rules/detail/share-button'
import { TableOfContents } from '@/components/rules/detail/table-of-contents'
import { UseWithAiDisclosure } from '@/components/rules/detail/use-with-ai-disclosure'

export { RuleResourcesSection } from '@/app/(site)/rules/[category]/[slug]/rule-page-resources'

interface RuleHeaderProps {
  rule: {
    id: string
    slug: string
    title: string
    description?: string
    content?: string
    filePath?: string
    priority: 'critical' | 'high' | 'medium' | 'low'
    difficulty?: string
    estimatedTime?: number
    categories: string[]
    whyItMatters?: string | null
    tldr?: string[]
  }
  hasPrompts: boolean
}

/**
 * Render the primary header for a rule detail page.
 *
 * @param props - Rule metadata used in the page header.
 */
export function RulePageHeader({ rule, hasPrompts }: RuleHeaderProps) {
  const aiHref = hasPrompts ? '#use-with-ai' : routeMcp()

  return (
    <header className="mb-6">
      <div className="space-y-6">
        <div className="space-y-5">
          <RuleCategoryChips categories={rule.categories} priority={rule.priority} />

          <div className="space-y-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <h1 className="font-heading font-medium text-6xl text-foreground leading-[1.05] tracking-tight xl:max-w-[min(100%,18ch)]">
                {rule.title}
              </h1>

              <div className="flex xl:shrink-0 xl:pt-1">
                <RuleCheckbox ruleId={rule.id} ruleTitle={rule.title} size="xl" variant="card" />
              </div>
            </div>

            {rule.description && (
              <p className="text-foreground-muted text-lg leading-8">{rule.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <span className="font-semibold text-foreground-muted text-xs uppercase tracking-[0.18em]">
              Utilities
            </span>
            <ShareButton title={rule.title} />
            <CopyMarkdownDropdown
              content={rule.content || ''}
              filePath={rule.filePath || ''}
              title={rule.title}
            />
          </div>

          <UseWithAiDisclosure aiHref={aiHref} hasPrompts={hasPrompts} slug={rule.slug} />
        </div>

        {rule.tldr && rule.tldr.length > 0 && (
          <RuleQuickTakeCard
            items={rule.tldr}
            whyItMatters={rule.whyItMatters}
            typicalFixTime={rule.estimatedTime}
          />
        )}
      </div>
    </header>
  )
}

interface RuleAnchorNavItem {
  label: string
  anchor: string
}

interface RuleAnchorNavProps {
  items: RuleAnchorNavItem[]
}

/**
 * Sticky in-page section nav for rule detail pages.
 * Visible on all viewports — supplements the desktop sidebar TOC.
 *
 * @param props - List of {label, anchor} pairs for sections present on the page.
 */
export function RuleAnchorNav({ items }: RuleAnchorNavProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Page sections"
      className="scrollbar-none mb-6 flex gap-1 overflow-x-auto border-border border-b pb-1 lg:hidden"
    >
      {items.map(({ label, anchor }) => (
        <a
          key={anchor}
          href={`#${anchor}`}
          className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-foreground-muted text-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          {label}
        </a>
      ))}
    </nav>
  )
}

interface RelatedRuleLink {
  id: string
  title: string
  slug: string
  primaryCategory: string
  description?: string
}

interface RuleSidebarProps {
  contentSelector: string
  relatedRules: RelatedRuleLink[]
}

/**
 * Render the desktop sidebar for the rule detail page.
 *
 * @param props - Table of contents, related rules, and MCP shortcut props.
 */
export function RuleSidebar({ contentSelector, relatedRules }: RuleSidebarProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-8 z-10 space-y-8">
        <TableOfContents contentSelector={contentSelector} minLevel={2} maxLevel={3} />
        {relatedRules.length > 0 && (
          <nav
            className="rounded-xl border border-border bg-background-subtle p-4"
            aria-labelledby="related-rules-heading"
          >
            <h3 id="related-rules-heading" className="mb-3 font-semibold text-foreground text-sm">
              Related Rules
            </h3>
            <ul className="m-0 list-none p-0">
              {relatedRules.map(related => (
                <li key={related.id} className="mb-2">
                  <a
                    href={routeRule(related.primaryCategory, related.slug)}
                    className="block py-1 text-[13px] text-foreground-muted transition-colors duration-150 hover:text-accent"
                  >
                    {related.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  )
}
