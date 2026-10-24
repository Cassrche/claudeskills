'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@repo/design-system/ui/accordion'
import { cn } from '@repo/utils'

export interface FaqAccordionItem {
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: FaqAccordionItem[]
  className?: string
}

/**
 * Reusable FAQ accordion (one item open at a time). Used on homepage and MCP page.
 */
export function FaqAccordion({ items, className }: FaqAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={items[0]?.question}
      className={cn('space-y-3', className)}
    >
      {items.map(item => (
        <AccordionItem
          key={item.question}
          value={item.question}
          className={cn(
            'transition-all duration-300 data-[state=open]:border-accent/20 data-[state=open]:bg-accent/5 data-[state=open]:shadow-accent/5 data-[state=open]:shadow-lg',
            'hover:border-border-focus hover:bg-background-subtle'
          )}
        >
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
