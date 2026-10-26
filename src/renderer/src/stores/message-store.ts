import { create } from 'zustand'
import { createMessage, sortMessages } from '@shared/messages/message-factory'
import type { SavedMessage } from '@shared/types/message'
import type { SocketPayload } from '@shared/types/protocol'
import { services } from '@/services'
import { saveQueue } from './workspace-persistence'
import { useWorkspaceStore } from './workspace-store'

export type MessagePatch = Partial<Omit<SavedMessage, 'id' | 'position'>>

interface MessageState {
  /** In list order. */
  messages: SavedMessage[]
  /** The message each request loaded last, by request id, so it can step on to the next one. */
  loaded: Record<string, string>
  load: () => Promise<void>
  create: (payload?: SocketPayload & { name?: string }) => SavedMessage
  update: (id: string, patch: MessagePatch) => void
  remove: (id: string) => void
  /** Moves a message one place up (-1) or down (1). */
  move: (id: string, offset: -1 | 1) => void
  markLoaded: (requestId: string, messageId: string) => void
}

type SetState = (patch: Partial<MessageState>) => void
type GetState = () => MessageState

/** Writes are debounced: a payload being typed is saved once it settles, like requests are. */
function persist(message: SavedMessage): void {
  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId
  if (workspaceId === null) return
  saveQueue.schedule(`${workspaceId}:message:${message.id}`, () => services.messages.saveMessage(workspaceId, message))
}

function forget(id: string): void {
  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId
  if (workspaceId !== null)
    saveQueue.schedule(`${workspaceId}:message:${id}`, () => services.messages.deleteMessage(workspaceId, id))
}

function nextName(messages: SavedMessage[]): string {
  const names = new Set(messages.map((message) => message.name))
  let n = messages.length + 1
  while (names.has(`Message ${n}`)) n += 1
  return `Message ${n}`
}

function createOne(set: SetState, get: GetState, input?: SocketPayload & { name?: string }): SavedMessage {
  const { messages } = get()
  const position = Math.max(0, ...messages.map((message) => message.position)) + 1
  const message = createMessage(input?.name?.trim() || nextName(messages), position, input)
  set({ messages: [...messages, message] })
  persist(message)
  return message
}

function updateOne(set: SetState, get: GetState, change: { id: string; patch: MessagePatch }): void {
  const messages = get().messages.map((message) =>
    message.id === change.id ? { ...message, ...change.patch } : message
  )
  set({ messages })
  const message = messages.find((candidate) => candidate.id === change.id)
  if (message) persist(message)
}

function moveOne(set: SetState, get: GetState, change: { id: string; offset: -1 | 1 }): void {
  const { messages } = get()
  const index = messages.findIndex((message) => message.id === change.id)
  const [a, b] = [messages[index], messages[index + change.offset]]
  if (!a || !b) return
  const swapped = [
    { ...a, position: b.position },
    { ...b, position: a.position }
  ]
  set({ messages: sortMessages(messages.map((message) => swapped.find((s) => s.id === message.id) ?? message)) })
  swapped.forEach(persist)
}

function removeOne(set: SetState, get: GetState, id: string): void {
  set({ messages: get().messages.filter((message) => message.id !== id) })
  forget(id)
}

async function loadAll(set: SetState): Promise<void> {
  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId
  const messages = workspaceId === null ? [] : await services.messages.listMessages(workspaceId)
  set({ messages: sortMessages(messages), loaded: {} })
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  messages: [],
  loaded: {},
  load: () => loadAll(set),
  create: (input) => createOne(set, get, input),
  update: (id, patch) => updateOne(set, get, { id, patch }),
  remove: (id) => removeOne(set, get, id),
  move: (id, offset) => moveOne(set, get, { id, offset }),
  markLoaded: (requestId, messageId) => set({ loaded: { ...get().loaded, [requestId]: messageId } })
}))
