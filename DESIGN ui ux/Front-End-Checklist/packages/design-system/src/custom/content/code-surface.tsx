import { CopyButton } from '@repo/design-system/custom/feedback/copy-button'
import { cn } from '@repo/utils'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { isValidElement } from 'react'

interface InlineCodeProps extends ComponentPropsWithoutRef<'code'> {}

interface CommandToken {
  text: string
  className?: string
}

interface CodeSurfaceProps extends ComponentPropsWithoutRef<'pre'> {
  code?: string
  codeClassName?: string
  copyText?: string
  density?: 'default' | 'compact'
  onCopySuccess?: () => void
  prompt?: string
  showCopyButton?: boolean
  wrapperClassName?: string
}

interface CommandCodeProps extends ComponentPropsWithoutRef<'code'> {
  prompt?: string
  tokens: CommandToken[]
}

/** Check whether an arbitrary object-like value exposes a `children` prop. */
function hasChildrenProp(value: unknown): value is { children?: ReactNode } {
  return typeof value === 'object' && value !== null && 'children' in value
}

/** Flatten nested React children into plain text for copy-to-clipboard content. */
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

/** Render inline code styling shared across app consumers. */
export function InlineCode({ className, ...props }: InlineCodeProps) {
  return <code data-slot="inline-code" className={cn('code-inline', className)} {...props} />
}

/** Render shell-style command code with an optional prompt prefix. */
export function CommandCode({ className, prompt = '$', tokens, ...props }: CommandCodeProps) {
  return (
    <code data-slot="command-code" className={className} {...props}>
      {prompt ? <span className="code-surface-prompt">{prompt} </span> : null}
      {tokens.map(token => (
        <span key={`${token.text}-${token.className ?? 'default'}`} className={token.className}>
          {token.text}
        </span>
      ))}
    </code>
  )
}

/** Render a reusable code surface with optional copy support. */
export function CodeSurface({
  children,
  className,
  code,
  codeClassName,
  copyText,
  density = 'default',
  onCopySuccess,
  prompt,
  showCopyButton,
  wrapperClassName,
  ...preProps
}: CodeSurfaceProps) {
  const resolvedCopyText = copyText ?? code ?? extractTextContent(children)
  const shouldShowCopyButton = showCopyButton ?? Boolean(resolvedCopyText)

  return (
    <div
      data-slot="code-surface-wrapper"
      className={cn(
        'code-block-wrapper',
        shouldShowCopyButton && 'code-block-wrapper--with-copy',
        density === 'compact' && 'code-block-wrapper--compact',
        wrapperClassName
      )}
    >
      {shouldShowCopyButton ? (
        <CopyButton text={resolvedCopyText} onCopySuccess={onCopySuccess} />
      ) : null}
      <pre data-slot="code-surface" className={className} {...preProps}>
        {children ?? (
          <code className={codeClassName}>
            {prompt ? <span className="code-surface-prompt">{prompt} </span> : null}
            {code}
          </code>
        )}
      </pre>
    </div>
  )
}
