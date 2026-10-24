'use client'

import { CodeSurface } from '@repo/design-system/custom/content/code-surface'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

interface CodeBlockProps extends ComponentPropsWithoutRef<'pre'> {
  code: string
  children: ReactNode
}

/**
 * Render a block code surface with copy support.
 *
 * @param props - Preformatted code block props.
 */
export function CodeBlock({ code, children, ...preProps }: CodeBlockProps) {
  return (
    <CodeSurface copyText={code} {...preProps}>
      {children}
    </CodeSurface>
  )
}
