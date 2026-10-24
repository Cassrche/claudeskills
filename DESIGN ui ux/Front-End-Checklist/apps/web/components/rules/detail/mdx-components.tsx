import { InlineCode } from '@repo/design-system/custom/content/code-surface'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { isValidElement } from 'react'
import {
  Callout,
  ErrorCallout,
  Exceptions,
  Success,
  Tip,
  Warning
} from '@/components/content/callouts/callout'
import { CodeBlock } from '@/components/content/code/code-block'
import { CodeTabs, Tab } from '@/components/content/code/code-tabs'
import { TLDRSummary } from '@/components/content/summary/tldr-summary'

/**
 * Check whether an arbitrary props object exposes `children`.
 *
 * @param value - Unknown props value.
 * @returns True when `children` is available.
 */
function hasChildrenProp(value: unknown): value is { children?: ReactNode } {
  return typeof value === 'object' && value !== null && 'children' in value
}

/**
 * Extract plain text from nested MDX children for copy buttons.
 *
 * @param children - React children tree.
 * @returns Flattened text content.
 */
function extractTextContent(children: ReactNode): string {
  if (typeof children === 'string') {
    return children
  }

  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('')
  }

  if (isValidElement(children)) {
    return hasChildrenProp(children.props) ? extractTextContent(children.props.children) : ''
  }

  return ''
}

/**
 * Enhanced pre element with a copy button.
 *
 * @param props - Native pre element props.
 */
function Pre({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const codeContent = extractTextContent(children)

  return (
    <CodeBlock code={codeContent} {...props}>
      {children}
    </CodeBlock>
  )
}

/**
 * Render inline code with block-code passthrough.
 *
 * @param props - Native code element props.
 */
function Code(props: ComponentPropsWithoutRef<'code'>) {
  const className = props.className ?? ''
  const dataLanguage = Reflect.get(props, 'data-language')
  const dataTheme = Reflect.get(props, 'data-theme')
  const isBlockCode = className.includes('language-') || Boolean(dataLanguage) || Boolean(dataTheme)

  if (isBlockCode) {
    return <code {...props} />
  }

  return <InlineCode {...props} />
}

/**
 * Enhanced anchor with external-link handling.
 *
 * @param props - Native anchor props.
 */
function Anchor({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const isExternal = href?.startsWith('http') || href?.startsWith('//')
  const externalProps = isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <a href={href} {...externalProps} {...props}>
      {children}
      {isExternal && <span className="sr-only"> (opens in new tab)</span>}
    </a>
  )
}

// Export all MDX components
export const mdxComponents = {
  // Override default elements
  pre: Pre,
  code: Code,
  a: Anchor,

  // Callout components
  Callout,
  Tip,
  Warning,
  ErrorBox: ErrorCallout,
  Success,
  Exceptions,

  // Summary components
  TLDRSummary,

  // Code tabs for framework examples
  CodeTabs,
  Tab
}

export type MDXComponents = typeof mdxComponents
