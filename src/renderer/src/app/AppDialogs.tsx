import { NewRequestDialog } from '@/features/request/NewRequestDialog'
import { CreateWorkspaceDialog } from '@/features/workspace/CreateWorkspaceDialog'
import { useUiStore } from '@/stores/ui-store'

export function AppDialogs() {
  const dialog = useUiStore((state) => state.dialog)
  const close = useUiStore((state) => state.closeDialog)
  return (
    <>
      <CreateWorkspaceDialog open={dialog?.type === 'create-workspace'} onClose={close} />
      <NewRequestDialog
        parentId={dialog?.type === 'new-request' ? dialog.parentId : null}
        open={dialog?.type === 'new-request'}
        onClose={close}
      />
    </>
  )
}
