import type { ReactNode } from 'react'
import { ConfirmDeleteDialog } from '@/features/confirm/ConfirmDeleteDialog'
import { LoadMessageDialog } from '@/features/messages/LoadMessageDialog'
import { SaveMessageDialog } from '@/features/messages/SaveMessageDialog'
import { NewRequestDialog } from '@/features/request/NewRequestDialog'
import { CreateWorkspaceDialog } from '@/features/workspace/CreateWorkspaceDialog'
import { useUiStore, type DialogState } from '@/stores/ui-store'

type OpenDialog = Exclude<DialogState, null>
type DialogOf<T extends OpenDialog['type']> = Extract<OpenDialog, { type: T }>
type Renderers = {
  [T in Exclude<OpenDialog['type'], 'create-workspace'>]: (dialog: DialogOf<T>, close: () => void) => ReactNode
}

const DIALOGS: Renderers = {
  'new-request': (dialog, close) => <NewRequestDialog {...dialog} onClose={close} />,
  'confirm-delete': (dialog, close) => <ConfirmDeleteDialog {...dialog} onClose={close} />,
  'load-message': (dialog, close) => <LoadMessageDialog requestId={dialog.requestId} onClose={close} />,
  'save-message': (dialog, close) => <SaveMessageDialog requestId={dialog.requestId} onClose={close} />
}

function renderDialog(dialog: DialogState, close: () => void): ReactNode {
  if (!dialog || dialog.type === 'create-workspace') return null
  const render = DIALOGS[dialog.type] as (dialog: OpenDialog, close: () => void) => ReactNode
  return render(dialog, close)
}

export function AppDialogs() {
  const dialog = useUiStore((state) => state.dialog)
  const close = useUiStore((state) => state.closeDialog)
  return (
    <>
      <CreateWorkspaceDialog open={dialog?.type === 'create-workspace'} onClose={close} />
      {renderDialog(dialog, close)}
    </>
  )
}
