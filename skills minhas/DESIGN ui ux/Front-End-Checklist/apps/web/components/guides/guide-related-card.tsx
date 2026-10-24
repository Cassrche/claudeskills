import { Card, CardContent } from '@repo/design-system/ui/card'
import Link from 'next/link'
import type { RelatedLink } from './guide-link-builders'

/**
 * Render a single related-content card for guide detail pages.
 *
 * @param props - Related-link card props.
 * @returns Card UI for a related rule, checklist, or guide.
 */
export function RelatedCard({ item }: { item: RelatedLink }) {
  return (
    <Card className="relative">
      <CardContent className="space-y-2 p-5">
        <p className="font-medium text-foreground-subtle text-xs uppercase tracking-[0.16em]">
          {item.meta}
        </p>
        <h3 className="font-semibold text-foreground">
          <Link
            href={item.href}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.title}
          </Link>
        </h3>
        {item.description ? (
          <p className="text-foreground-muted text-sm">{item.description}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
