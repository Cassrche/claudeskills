/** Focus management utilities for keyboard accessibility. */

/** Traps keyboard focus within the given element; returns a cleanup function. */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]
  const firstFocusable = first instanceof HTMLElement ? first : null
  const lastFocusable = last instanceof HTMLElement ? last : null

  /** Wraps Tab/Shift+Tab to keep focus within the container. */
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown)
  firstFocusable?.focus()

  return () => {
    element.removeEventListener('keydown', handleKeyDown)
  }
}

/** Sets up roving tabindex keyboard navigation for menu/option/tab items in a container. */
export function createRovingTabIndex(container: HTMLElement): () => void {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[role="menuitem"], [role="option"], [role="tab"]')
  )

  if (items.length === 0) return () => {}

  let currentIndex = 0

  items.forEach((item, index) => {
    item.setAttribute('tabindex', index === 0 ? '0' : '-1')
  })

  /** Moves focus between items using arrow keys, Home, and End. */
  function handleKeyDown(e: KeyboardEvent) {
    const key = e.key
    let newIndex = currentIndex

    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        newIndex = (currentIndex + 1) % items.length
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        newIndex = (currentIndex - 1 + items.length) % items.length
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = items.length - 1
        break
      default:
        return
    }

    items[currentIndex].setAttribute('tabindex', '-1')
    items[newIndex].setAttribute('tabindex', '0')
    items[newIndex].focus()
    currentIndex = newIndex
  }

  container.addEventListener('keydown', handleKeyDown)

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}
