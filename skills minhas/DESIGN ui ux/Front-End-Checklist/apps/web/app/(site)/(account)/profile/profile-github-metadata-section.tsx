'use client'

interface GithubMetadataSectionProps {
  company?: string
  blog?: string
  location?: string
  publicRepos?: number
  followers?: number
}

/**
 * Render read-only metadata imported from GitHub.
 */
export function GithubMetadataSection({
  company,
  blog,
  location,
  publicRepos,
  followers
}: GithubMetadataSectionProps) {
  const items = [
    company ? { label: 'Company', value: company } : null,
    location ? { label: 'Location', value: location } : null,
    blog ? { label: 'Website', value: blog, href: getWebsiteHref(blog) } : null,
    typeof followers === 'number'
      ? { label: 'Followers', value: followers.toLocaleString() }
      : null,
    typeof publicRepos === 'number'
      ? { label: 'Public repositories', value: publicRepos.toLocaleString() }
      : null
  ].filter((item): item is { label: string; value: string; href?: string } => Boolean(item))

  if (items.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="mb-3 font-semibold text-foreground text-sm">GitHub profile data</h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <div key={item.label} className="rounded-md border border-border bg-card px-3 py-2">
            <dt className="text-foreground-muted text-xs">{item.label}</dt>
            <dd className="mt-1 break-words font-medium text-foreground text-sm">
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline hover:no-underline"
                >
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-foreground-muted text-xs">
        These fields are imported from GitHub and refresh only when you sync.
      </p>
    </section>
  )
}

/**
 * Convert a GitHub website value into a navigable URL.
 *
 * @param value - Website value returned by GitHub.
 * @returns Absolute URL for external navigation.
 */
function getWebsiteHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}
