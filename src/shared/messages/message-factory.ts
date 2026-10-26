import type { SavedMessage } from '../types/message'
import type { SocketPayload } from '../types/protocol'
import { createId } from '../utils/id'

const EMPTY_PAYLOAD: SocketPayload = { payload: '', encoding: 'text', lineEnding: 'none' }

export function createMessage(name: string, position: number, payload: SocketPayload = EMPTY_PAYLOAD): SavedMessage {
  const { payload: text, encoding, lineEnding } = payload
  return { id: createId('msg'), name, position, payload: text, encoding, lineEnding }
}

export function isMessageId(id: string): boolean {
  return id.startsWith('msg_')
}

/** The list order: by position, then by name for ties (files edited by hand). */
export function sortMessages(messages: SavedMessage[]): SavedMessage[] {
  return [...messages].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}
