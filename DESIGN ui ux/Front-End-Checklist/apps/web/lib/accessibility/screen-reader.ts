/** Screen reader announcement utilities. */

/** Announces a message to screen readers via a temporary ARIA live region. */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/** Creates a persistent ARIA live region for repeated announcements; returns announce/destroy handles. */
export function createLiveRegion(priority: 'polite' | 'assertive' = 'polite'): {
  announce: (message: string) => void
  destroy: () => void
} {
  const region = document.createElement('div')
  region.setAttribute('role', 'status')
  region.setAttribute('aria-live', priority)
  region.setAttribute('aria-atomic', 'true')
  region.className = 'sr-only'
  document.body.appendChild(region)

  return {
    announce: (message: string) => {
      region.textContent = ''
      void region.offsetHeight
      region.textContent = message
    },
    destroy: () => {
      document.body.removeChild(region)
    }
  }
}
