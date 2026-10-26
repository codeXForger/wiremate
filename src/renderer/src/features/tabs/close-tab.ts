import { categoryOf, categoryTerms } from '@shared/protocols/categories'
import { useTabStore } from '@/stores/tab-store'
import { useUiStore, type DeleteConfirmation } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { socketSessions } from '../protocols/socket/socket-actions'
import { socketCloseConfirmation } from '../protocols/socket/socket-close'

/** Closing an unsaved draft throws it away (and closes its socket), so it asks first. */
function draftConfirmation(id: string): DeleteConfirmation | null {
  const { requests, drafts } = useWorkspaceStore.getState()
  const request = requests[id]
  if (!request || !(id in drafts)) return null
  const { item } = categoryTerms(categoryOf(request.protocol))
  const live = socketSessions.isOpen(id) ? ' Its connection closes too.' : ''
  return {
    title: `Discard this ${item}?`,
    message: `"${request.name}" was never saved.${live}`,
    note: `Save it from the bar above its details to keep it.`,
    confirmLabel: 'Discard',
    onConfirm: () => useWorkspaceStore.getState().discardDraft(id)
  }
}

/** Closes a tab; an unsaved draft or a request with an open socket asks first. */
export function requestCloseTab(id: string): void {
  const close = (): void => useTabStore.getState().close(id)
  const confirmation = draftConfirmation(id) ?? socketCloseConfirmation(id, close)
  if (confirmation) useUiStore.getState().openDialog({ type: 'confirm-delete', ...confirmation })
  else close()
}
