'use client'

import { Check, Copy } from '@repo/design-system/icons'
import { Button, type ButtonProps } from '@repo/design-system/ui/button'
import { cn } from '@repo/utils'
import { useCallback, useRef, useState } from 'react'

export interface CopyButtonProps extends Omit<ButtonProps, 'children'> {
  text: string
  copiedLabel?: string
  defaultLabel?: string
  iconClassName?: string
  onCopySuccess?: () => void
}

/** Render a button that copies text to the clipboard and exposes copied feedback. */
export function CopyButton({
  text,
  className,
  variant = 'ghost',
  size = 'icon',
  copiedLabel = 'Copied!',
  defaultLabel = 'Copy to clipboard',
  iconClassName,
  onCopySuccess,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopySuccess?.()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [text, onCopySuccess])

  const label = copied ? copiedLabel : defaultLabel

  return (
    <Button
      data-slot="copy-button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn('group copy-button', className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {copied ? (
        <Check
          className={cn(
            'h-4 w-4 text-green-500 transition-[filter] duration-150 group-active:blur-[2px]',
            iconClassName
          )}
          aria-hidden="true"
        />
      ) : (
        <Copy
          className={cn(
            'h-4 w-4 transition-[filter] duration-150 group-active:blur-[2px]',
            iconClassName
          )}
          aria-hidden="true"
        />
      )}
    </Button>
  )
}
