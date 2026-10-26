import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { DeleteConfirmation } from '@/stores/ui-store'

interface ConfirmDeleteDialogProps extends DeleteConfirmation {
  onClose: () => void
}

/**
 * Asks before deleting, or before anything else that cannot be taken back (closing an open connection). Cancel has
 * the focus, so Enter alone never confirms.
 */
export function ConfirmDeleteDialog({ title, message, note, confirmLabel, ...actions }: ConfirmDeleteDialogProps) {
  const { onConfirm, onClose } = actions
  const confirm = (): void => [onConfirm, onClose].forEach((run) => run())
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent role="alertdialog" className="w-[min(420px,calc(100vw-32px))]">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{`${message} ${note ?? 'This cannot be undone.'}`}</DialogDescription>
        <ConfirmActions label={confirmLabel ?? 'Delete'} onConfirm={confirm} />
      </DialogContent>
    </Dialog>
  )
}

function ConfirmActions({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <DialogClose asChild>
        <Button autoFocus>Cancel</Button>
      </DialogClose>
      <Button variant="destructive" onClick={onConfirm}>
        {label}
      </Button>
    </div>
  )
}
