/**
 * Accessibility Testing Utilities
 *
 * Integration with axe-core for automated accessibility testing
 * following WCAG 2.1 AAA standards.
 */

import { type RenderOptions, render } from '@testing-library/react'
import { type AxeResults, axe, type RunOptions, toHaveNoViolations } from 'jest-axe'
import React, { type ReactElement } from 'react'

// Extend Jest expect
expect.extend(toHaveNoViolations)

interface A11yRenderOptions extends RenderOptions {
  axeOptions?: RunOptions
}

/** Renders a component and runs axe accessibility checks, returning violations. */
export async function a11yRender(
  ui: ReactElement,
  options: A11yRenderOptions = {}
): Promise<{
  container: HTMLElement
  results: AxeResults
  hasViolations: boolean
}> {
  const { axeOptions, ...renderOptions } = options
  const { container } = render(ui, renderOptions)

  const results = await axe(container, {
    rules: {
      // WCAG 2.1 AAA specific rules
      'color-contrast-enhanced': { enabled: true },
      'identical-links-same-purpose': { enabled: true },
      'label-content-name-mismatch': { enabled: true },
      'link-in-text-block': { enabled: true }
    },
    ...axeOptions
  })

  return {
    container,
    results,
    hasViolations: results.violations.length > 0
  }
}

/** Formats axe violation results into a human-readable string for test output. */
export function formatViolations(results: AxeResults): string {
  if (results.violations.length === 0) {
    return 'No accessibility violations found!'
  }

  return results.violations
    .map(violation => {
      const nodes = violation.nodes.map(node => `  - ${node.html}`).join('\n')

      return `
[${violation.id}] ${violation.description}
Impact: ${violation.impact}
Help: ${violation.helpUrl}
Affected nodes:
${nodes}
`
    })
    .join('\n')
}

/** Creates a reusable test function that asserts zero axe violations for the given UI. */
export function createA11yTest(ui: ReactElement, options?: A11yRenderOptions) {
  return async () => {
    const { results, hasViolations } = await a11yRender(ui, options)

    if (hasViolations) {
      console.error(formatViolations(results))
    }

    expect(results).toHaveNoViolations()
  }
}

// Common accessibility test cases
export const commonA11yTests = {
  /**
   * Test that images have alt text
   */
  hasAltText: (container: HTMLElement): void => {
    const images = container.querySelectorAll('img')
    images.forEach(img => {
      expect(img).toHaveAttribute('alt')
    })
  },

  /**
   * Test that buttons have accessible names
   */
  buttonsHaveAccessibleNames: (container: HTMLElement): void => {
    const buttons = container.querySelectorAll('button')
    buttons.forEach(button => {
      const hasContent = button.textContent?.trim()
      const hasAriaLabel = button.hasAttribute('aria-label')
      const hasAriaLabelledBy = button.hasAttribute('aria-labelledby')

      expect(hasContent || hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
    })
  },

  /**
   * Test that form inputs have labels
   */
  formInputsHaveLabels: (container: HTMLElement): void => {
    const inputs = container.querySelectorAll('input, select, textarea')
    inputs.forEach(input => {
      const id = input.id
      const hasLabel = id && container.querySelector(`label[for="${id}"]`)
      const hasAriaLabel = input.hasAttribute('aria-label')
      const hasAriaLabelledBy = input.hasAttribute('aria-labelledby')

      expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
    })
  },

  /**
   * Test that heading levels are sequential
   */
  headingLevelsAreSequential: (container: HTMLElement): void => {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))

    let previousLevel = 0
    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1], 10)
      // Level should not skip (e.g., h1 -> h3)
      expect(level - previousLevel).toBeLessThanOrEqual(1)
      previousLevel = level
    })
  },

  /**
   * Test that links have discernible text
   */
  linksHaveDiscernibleText: (container: HTMLElement): void => {
    const links = container.querySelectorAll('a')
    links.forEach(link => {
      const hasContent = link.textContent?.trim()
      const hasAriaLabel = link.hasAttribute('aria-label')
      const hasAriaLabelledBy = link.hasAttribute('aria-labelledby')
      const hasImage = link.querySelector('img[alt]')

      expect(hasContent || hasAriaLabel || hasAriaLabelledBy || hasImage).toBeTruthy()
    })
  },

  /**
   * Test that interactive elements are keyboard accessible
   */
  interactiveElementsAreKeyboardAccessible: (container: HTMLElement): void => {
    const interactive = container.querySelectorAll('a, button, input, select, textarea, [tabindex]')

    interactive.forEach(element => {
      const tabindex = element.getAttribute('tabindex')
      // Elements should not have tabindex < -1
      if (tabindex) {
        expect(parseInt(tabindex, 10)).toBeGreaterThanOrEqual(-1)
      }
    })
  }
}

/** Computes the contrast ratio between two hex colors and checks WCAG AAA compliance. */
export function testColorContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): { ratio: number; passes: boolean } {
  const fgMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(foreground)
  const bgMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(background)
  const fgRgb = fgMatch
    ? [parseInt(fgMatch[1], 16), parseInt(fgMatch[2], 16), parseInt(fgMatch[3], 16)]
    : [0, 0, 0]
  const bgRgb = bgMatch
    ? [parseInt(bgMatch[1], 16), parseInt(bgMatch[2], 16), parseInt(bgMatch[3], 16)]
    : [0, 0, 0]

  /** Converts an 8-bit sRGB channel value to linear light. */
  const toLinear = (c: number) =>
    c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4
  const l1 = 0.2126 * toLinear(fgRgb[0]) + 0.7152 * toLinear(fgRgb[1]) + 0.0722 * toLinear(fgRgb[2])
  const l2 = 0.2126 * toLinear(bgRgb[0]) + 0.7152 * toLinear(bgRgb[1]) + 0.0722 * toLinear(bgRgb[2])
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  const threshold = isLargeText ? 4.5 : 7
  return { ratio, passes: ratio >= threshold }
}

export { axe, toHaveNoViolations }
