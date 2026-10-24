import { ConfirmDialog } from '@repo/design-system/custom/feedback/confirm-dialog'

interface RulesBrowserResetDialogProps {
  isOpen: boolean
  completedCount: number
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Render the reset-progress confirmation for the rules browser toolbar.
 * @param props - Dialog state and reset callbacks.
 */
export function RulesBrowserResetDialog({
  isOpen,
  completedCount,
  onConfirm,
  onCancel
}: RulesBrowserResetDialogProps) {
  const hasCompletedRules = completedCount > 0

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title="Reset progress for these rules?"
      description={
        hasCompletedRules
          ? `This will uncheck ${completedCount} ${completedCount === 1 ? 'rule' : 'rules'} in the current view. This action cannot be undone.`
          : "You haven't checked any of these rules yet. There's nothing to reset."
      }
      confirmLabel={hasCompletedRules ? 'Reset Progress' : 'OK'}
      cancelLabel={hasCompletedRules ? 'Cancel' : 'Close'}
      variant={hasCompletedRules ? 'danger' : 'default'}
    />
  )
}
