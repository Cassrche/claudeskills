'use client'

import { CodeSurface } from '@repo/design-system/custom/content/code-surface'
import { Card, CardContent } from '@repo/design-system/ui/card'

interface SetupCardProps {
  title: string
  description: string
  config: string
}

/**
 * Card showing a config snippet with copy button.
 */
export function SetupCard({ title, description, config }: SetupCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="font-medium text-foreground text-sm">{title}</h3>
            <p className="mt-0.5 text-foreground-muted text-xs">{description}</p>
          </div>
        </div>
        <CodeSurface code={config} copyText={config} wrapperClassName="my-0" />
      </CardContent>
    </Card>
  )
}
