import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { DeleteConfirmation } from '@/stores/ui-store'

interface ConfirmDeleteDialogProps extends DeleteConfirmation {
  onClose: () => void
}

/** Asks before deleting. Cancel has the focus, so Enter alone never deletes anything. */
export function ConfirmDeleteDialog({ title, message, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  const confirm = (): void => {
    onConfirm()
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent role="alertdialog" className="w-[min(420px,calc(100vw-32px))]">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{message} This cannot be undone.</DialogDescription>
        <ConfirmActions onConfirm={confirm} />
      </DialogContent>
    </Dialog>
  )
}

function ConfirmActions({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <DialogClose asChild>
        <Button autoFocus>Cancel</Button>
      </DialogClose>
      <Button variant="destructive" onClick={onConfirm}>
        Delete
      </Button>
    </div>
  )
}
