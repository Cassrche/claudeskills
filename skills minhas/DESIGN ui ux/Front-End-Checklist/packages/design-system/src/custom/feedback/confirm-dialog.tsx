'use client'

import { AlertTriangle } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@repo/design-system/ui/dialog'
import { cn } from '@repo/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
}

const variantStyles = {
  danger: {
    icon: 'text-destructive',
    iconBg: 'bg-destructive/10',
    confirmButton:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive'
  },
  warning: {
    icon: 'text-warning',
    iconBg: 'bg-warning/10',
    confirmButton:
      'bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning'
  },
  default: {
    icon: 'text-accent',
    iconBg: 'bg-accent/10',
    confirmButton:
      'bg-accent text-accent-foreground hover:bg-accent-hover focus-visible:ring-accent'
  }
} as const

/** Render a reusable confirmation dialog with semantic variants for destructive flows. */
export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}: ConfirmDialogProps) {
  const styles = variantStyles[variant]

  return (
    <Dialog open={isOpen} onOpenChange={open => (!open ? onCancel() : undefined)}>
      <DialogContent
        showClose
        className="max-w-md"
        onEscapeKeyDown={onCancel}
        onPointerDownOutside={onCancel}
      >
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            styles.iconBg
          )}
        >
          <AlertTriangle className={cn('h-6 w-6', styles.icon)} aria-hidden="true" />
        </div>

        <DialogHeader className="text-center">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:grid sm:grid-cols-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button className={styles.confirmButton} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
