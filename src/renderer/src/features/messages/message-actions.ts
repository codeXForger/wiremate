import type { SavedMessage } from '@shared/types/message'
import type { TcpConfig, UdpConfig } from '@shared/types/protocol'
import { formatBytes } from '@shared/utils/format'
import { payloadSize } from '@shared/utils/payload'
import { useMessageStore } from '@/stores/message-store'
import { useTabStore } from '@/stores/tab-store'
import { useToastStore } from '@/stores/toast-store'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { confirmDelete } from '../confirm/confirm-delete'

export function createAndOpenMessage(): void {
  useTabStore.getState().open(useMessageStore.getState().create().id)
}

export function renameMessage(id: string, name: string): void {
  useMessageStore.getState().update(id, { name })
}

export function askToDeleteMessage(message: SavedMessage): void {
  confirmDelete({
    title: 'Delete message?',
    message: `The saved message "${message.name}" will be deleted.`,
    onConfirm: () => useMessageStore.getState().remove(message.id)
  })
}

/** "1.2 KB", or "invalid hex". */
export function describeSize(message: SavedMessage): string {
  const size = payloadSize(message)
  return size === null ? 'invalid hex' : formatBytes(size)
}

function socketConfig(requestId: string): TcpConfig | UdpConfig | undefined {
  const request = useWorkspaceStore.getState().requests[requestId]
  return request?.protocol === 'tcp' || request?.protocol === 'udp' ? request.config : undefined
}

/** Puts a saved message in the request's payload, with its encoding and line ending. */
export function loadMessage(requestId: string, messageId: string): void {
  const message = useMessageStore.getState().messages.find((candidate) => candidate.id === messageId)
  if (!message || !socketConfig(requestId)) return
  const { payload, encoding, lineEnding } = message
  useWorkspaceStore.getState().updateConfig<'tcp'>(requestId, { payload, encoding, lineEnding })
  useTabStore.getState().markDirty(requestId)
  useMessageStore.getState().markLoaded(requestId, messageId)
}

/** Saves the request's payload as a new message at the end of the list. */
export function saveAsMessage(requestId: string, name: string): void {
  const config = socketConfig(requestId)
  if (!config) return
  const message = useMessageStore.getState().create({ ...config, name })
  useMessageStore.getState().markLoaded(requestId, message.id)
  useToastStore.getState().show({ tone: 'success', title: `Saved as "${message.name}"` })
}

export function openLoadDialog(requestId: string): void {
  useUiStore.getState().openDialog({ type: 'load-message', requestId })
}

export function openSaveDialog(requestId: string): void {
  useUiStore.getState().openDialog({ type: 'save-message', requestId })
}
