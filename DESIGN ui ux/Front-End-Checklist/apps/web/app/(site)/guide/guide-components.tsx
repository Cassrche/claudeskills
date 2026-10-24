/** Presentational components for the Guide page. */

import { CheckCircle2 } from '@repo/design-system/icons'
import { Card, CardContent } from '@repo/design-system/ui/card'
import { cn } from '@repo/utils'
import { priorityBadgeStyles } from '@/lib/badge-styles'

/** Renders a colored dot and label for a given priority level. */
export function PriorityIndicator({
  priority
}: {
  priority: 'critical' | 'high' | 'medium' | 'low'
}) {
  const config = priorityBadgeStyles[priority]
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1',
        config.surface
      )}
    >
      <div className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      <span className="font-medium text-xs">{config.label}</span>
    </div>
  )
}

interface PriorityCardProps {
  level: 'critical' | 'high' | 'medium' | 'low'
  description: string
  examples: string[]
  action: string
}

/** Displays a priority level with its description, examples, and recommended action. */
export function PriorityCard({ level, description, examples, action }: PriorityCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="border-border border-b p-5">
          <div className="mb-3 flex items-center gap-3">
            <PriorityIndicator priority={level} />
          </div>
          <p className="text-[13px] text-foreground-muted leading-relaxed">{description}</p>
        </div>
        <div className="bg-background-subtle p-5">
          <p className="mb-3 font-medium text-[11px] text-foreground-muted uppercase tracking-wide">
            Examples
          </p>
          <ul className="space-y-2">
            {examples.map((example, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-foreground-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" />
                {example}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-border border-t pt-4 font-medium text-[13px] text-foreground">
            → {action}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Renders a numbered step in the quick-start guide. */
export function StepCard({
  number,
  title,
  description
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground text-sm">
          {number}
        </span>
        <h3 className="font-medium text-foreground text-sm">{title}</h3>
      </div>
      <p className="text-[13px] text-foreground-muted leading-relaxed">{description}</p>
    </div>
  )
}

/** Renders a pro-tip card with a title and description. */
export function TipCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-1 font-medium text-foreground text-sm">{title}</h3>
      <p className="text-[13px] text-foreground-muted">{description}</p>
    </div>
  )
}
