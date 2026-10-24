import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import React, { type ReactElement } from 'react'

/** Wraps test components with all required context providers. */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult =>
  render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'
export { customRender as render }
