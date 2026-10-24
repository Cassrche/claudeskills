'use client'

import { useState } from 'react'

/**
 * Counter component for testing interactive state management
 * @returns A counter component with increment, decrement, and reset buttons
 */
export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <div data-testid="counter-display">{count}</div>
      <button type="button" onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button type="button" onClick={() => setCount(count - 1)}>
        Decrement
      </button>
      <button type="button" onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  )
}
