import type { StreamDirection, StreamEvent, StreamSession } from '@shared/types/response'
import type { SocketEvent } from '@shared/types/socket'
import { createId } from '@shared/utils/id'

/** The newest events a session keeps, so a chatty socket cannot grow without bound. */
export const MAX_SOCKET_EVENTS = 2000

type Change = Partial<Omit<StreamSession, 'kind' | 'events'>>

const STATE_CHANGE: Partial<Record<SocketEvent['kind'], Change>> = {
  open: { connected: true, connecting: false },
  close: { connected: false, connecting: false, peers: [] }
}

const DIRECTION: Record<Exclude<SocketEvent['kind'], 'peers'>, StreamDirection> = {
  open: 'system',
  info: 'system',
  close: 'system',
  error: 'error',
  in: 'in',
  out: 'out'
}

export function emptySession(): StreamSession {
  return { kind: 'stream', connected: false, events: [] }
}

/** Adds an event to a session's log, dropping the oldest past the limit. */
export function appendEvent(session: StreamSession, event: StreamEvent): StreamSession {
  return { ...session, events: [...session.events, event].slice(-MAX_SOCKET_EVENTS) }
}

/** Turns what a socket reported into the session the response pane shows. */
export function applySocketEvent(session: StreamSession, event: SocketEvent): StreamSession {
  if (event.kind === 'peers') return { ...session, peers: event.peers }
  const changed = { ...session, ...STATE_CHANGE[event.kind] }
  return appendEvent(changed, toStreamEvent(event))
}

function toStreamEvent(event: Exclude<SocketEvent, { kind: 'peers' }>): StreamEvent {
  const base = { id: createId('evt'), direction: DIRECTION[event.kind], at: event.at }
  if ('message' in event) return { ...base, data: event.message }
  return { ...base, data: new TextDecoder().decode(event.bytes), peer: event.peer, bytes: event.bytes }
}
