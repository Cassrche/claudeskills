'use client'

import { HelpCircle } from '@repo/design-system/icons'
import { FaqAccordion } from '@/components/content/disclosures/faq-accordion'

const FAQ_ITEMS = [
  {
    question: 'What is the Front-End Checklist?',
    answer:
      'The Front-End Checklist is a comprehensive list of best practices and guidelines for modern web development. It covers HTML, CSS, JavaScript, Performance, Accessibility, SEO, and Security. Originally created in 2017, it has been used by thousands of developers worldwide.'
  },
  {
    question: 'Is it free to use?',
    answer:
      'Yes! The checklist is completely free and open source under the MIT license. You can use it for personal projects, commercial work, and even contribute to it on GitHub. The core checklist will always remain free.'
  },
  {
    question: 'How do I track my progress?',
    answer:
      "Simply click on any rule to mark it as complete. Your progress is automatically saved in your browser's local storage, so you can close the tab and come back later. Each category shows a progress bar indicating how many items you've completed."
  },
  {
    question: 'Can I create custom checklists?',
    answer:
      'Yes! You can create custom checklists with specific rules that match your project\'s needs. Use the "My Checklists" feature to build, save, and manage your own collections of rules.'
  },
  {
    question: 'How do the AI prompts work?',
    answer:
      'Each rule includes ready-to-use prompts for AI assistants like ChatGPT or Claude. There are three types: "Check" prompts help verify if your code follows the rule, "Fix" prompts help resolve issues, and "Explain" prompts help you understand why the rule matters.'
  },
  {
    question: 'Can I contribute to the checklist?',
    answer:
      'Absolutely! The Front-End Checklist is open source and welcomes contributions. You can suggest new rules, improve existing ones, fix bugs, or help with translations. Visit our GitHub repository to get started.'
  }
]

/** Renders the homepage FAQ accordion with common questions about the checklist. */
export function FAQSection() {
  return (
    <section aria-labelledby="faq-heading" className="relative py-16 sm:py-20 lg:py-24">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background-subtle/50 to-transparent" />

      <div className="container-content relative">
        <div className="mx-auto max-w-3xl">
          {/* Section Header */}
          <div className="mb-12 text-center">
            <div className="mb-2 inline-flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-accent" />
              <span className="font-medium text-accent text-sm uppercase tracking-wider">FAQ</span>
            </div>
            <h2 id="faq-heading" className="font-heading font-semibold text-3xl text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-foreground-muted">
              Everything you need to know about the Front-End Checklist
            </p>
          </div>

          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </div>
    </section>
  )
}
