import type { RuleResource, RuleSource } from '@repo/types'
import { formatTechTerm } from '@repo/utils'
import { ResourceGrid, ToolGrid } from '@/components/rules/detail/resource-card'

interface ToolLink {
  name: string
  url: string
}

interface RuleResourcesSectionProps {
  sources?: RuleSource[]
  resources?: RuleResource[]
  tools?: ToolLink[]
}

const sourceTypeLabels: Record<string, string> = {
  mdn: 'MDN',
  wcag: 'WCAG',
  spec: 'Spec',
  guide: 'Guide',
  google: 'Google',
  documentation: 'Docs',
  owasp: 'OWASP',
  'web.dev': 'web.dev'
}

/**
 * Map a source type to a short UI label.
 *
 * @param type - Source type from frontmatter.
 * @returns Human-readable label.
 */
export function getSourceTypeLabel(type?: string): string {
  if (!type) return 'Reference'

  return sourceTypeLabels[type.toLowerCase()] ?? formatTechTerm(type)
}

/** Render the compact sources section for a rule. */
function SourcesSection({ sources }: { sources: RuleSource[] }) {
  return (
    <section aria-labelledby="sources-heading" className="prose mt-12">
      <h2 id="sources-heading">Sources</h2>
      <p className="mb-4! text-foreground-muted">
        References used to support the guidance in this rule.
      </p>
      <ul className="not-prose m-0 list-none space-y-3 p-0">
        {sources.map(source => (
          <li
            key={source.id}
            className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
          >
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-accent"
            >
              {source.title}
            </a>
            <div className="mt-1 flex flex-wrap gap-2 text-foreground-muted text-xs">
              <span>{getSourceTypeLabel(source.type)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Render the optional sources/resources sections for a rule.
 *
 * @param props - References, further reading, and legacy tool links.
 */
export function RuleResourcesSection({ sources, resources, tools }: RuleResourcesSectionProps) {
  const hasSources = Boolean(sources && sources.length > 0)
  const hasResources = Boolean((resources && resources.length > 0) || (tools && tools.length > 0))

  if (!hasSources && !hasResources) {
    return null
  }

  return (
    <>
      {hasSources && sources && <SourcesSection sources={sources} />}

      {hasResources && (
        <section aria-labelledby="resources-heading" className="prose mt-12">
          <h2 id="resources-heading">Further Reading</h2>
          <p className="mb-6! text-foreground-muted">
            Tools and supplementary material for exploring the topic in more depth.
          </p>
          {resources && resources.length > 0 && (
            <ResourceGrid resources={resources} className="mt-0! mb-6" />
          )}
          {tools && tools.length > 0 && <ToolGrid tools={tools} className="mt-0!" />}
        </section>
      )}
    </>
  )
}
