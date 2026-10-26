import type { SocketPayload } from './protocol'

/** A payload kept in the workspace, to load into any TCP or UDP request. */
export interface SavedMessage extends SocketPayload {
  id: string
  name: string
  /** Where it sits in the list; messages are meant to be sent in this order. */
  position: number
}
