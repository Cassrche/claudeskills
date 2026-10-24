/** Miscellaneous accessibility helpers. */

/** Focuses and scrolls to the skip-link target element by ID. */
export function handleSkipLink(targetId: string): void {
  const target = document.getElementById(targetId)
  if (target) {
    target.setAttribute('tabindex', '-1')
    target.focus()
    target.scrollIntoView({ behavior: 'smooth' })
  }
}

let idCounter = 0
/** Generates a unique ID for ARIA relationship attributes (e.g. aria-labelledby). */
export function generateId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}`
}
