import { ClipboardList, Lightbulb } from '@repo/design-system/icons'

interface TLDRSummaryProps {
  items: string[]
  whyItMatters?: string | null
}

/** Displays a quick-reference bullet list with an optional "why it matters" note. */
export function TLDRSummary({ items, whyItMatters }: TLDRSummaryProps) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="tldr-summary">
      <div className="tldr-summary-header">
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        <span>Quick Reference</span>
      </div>
      <ul className="tldr-summary-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      {whyItMatters && (
        <div className="tldr-why">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
          <span>
            <strong>Why:</strong> {whyItMatters}
          </span>
        </div>
      )}
    </div>
  )
}
