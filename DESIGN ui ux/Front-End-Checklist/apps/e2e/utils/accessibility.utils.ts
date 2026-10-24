import type { Page } from '@playwright/test'

/** Accessibility helper methods for end-to-end tests. */
export class AccessibilityUtils {
  constructor(private page: Page) {}

  async checkA11y() {
    // Placeholder for axe-core integration
    // In a real implementation, you would use @axe-core/playwright

    return {
      violations: [],
      passes: [],
      incomplete: []
    }
  }

  async checkKeyboardNavigation() {
    // Check if all interactive elements are keyboard accessible
    const interactiveElements = await this.page.$$('button, a, input, select, textarea, [tabindex]')

    for (const element of interactiveElements) {
      const isVisible = await element.isVisible()
      const isEnabled = await element.isEnabled()

      if (isVisible && isEnabled) {
        // Check if element can receive focus
        await element.focus()
        const isFocused = await element.evaluate(el => el === document.activeElement)

        if (!isFocused) {
          console.warn('Element cannot receive focus:', element)
        }
      }
    }
  }

  async checkColorContrast() {
    // Placeholder for color contrast checking
    return {
      passes: true,
      issues: []
    }
  }

  async checkAriaLabels() {
    const elements = await this.page.$$('[aria-label], [aria-labelledby], [aria-describedby]')
    const issues = []

    for (const element of elements) {
      const ariaLabelledBy = await element.getAttribute('aria-labelledby')

      if (ariaLabelledBy) {
        const labelElement = await this.page.$(`#${ariaLabelledBy}`)
        if (!labelElement) {
          issues.push({
            element: await element.evaluate(el => el.outerHTML),
            issue: `aria-labelledby references non-existent element: ${ariaLabelledBy}`
          })
        }
      }
    }

    return issues
  }
}
