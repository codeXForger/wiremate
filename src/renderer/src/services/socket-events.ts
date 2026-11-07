import type { StreamDirection, StreamEvent, StreamSession } from '@shared/types/response'
import type { SocketEvent } from '@shared/types/socket'
import { createId } from '@shared/utils/id'

/** The newest events a session keeps, so a chatty socket cannot grow without bound. */
export const MAX_SOCKET_EVENTS = 2000

type Change = Partial<Omit<StreamSession, 'kind' | 'events'>>

/** The kinds of event that join a session's log. */
export type LoggedKind = 'open' | 'info' | 'error' | 'close' | 'in' | 'out'

const STATE_CHANGE: Partial<Record<LoggedKind, Change>> = {
  open: { connected: true, connecting: false },
  close: { connected: false, connecting: false, peers: [] }
}

const DIRECTION: Record<LoggedKind, StreamDirection> = {
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

/** Logs an event: opening and closing also change whether the session is connected. */
export function logEvent(
  session: StreamSession,
  kind: LoggedKind,
  event: Omit<StreamEvent, 'id' | 'direction'>
): StreamSession {
  const changed = { ...session, ...STATE_CHANGE[kind] }
  return appendEvent(changed, { id: createId('evt'), direction: DIRECTION[kind], ...event })
}

/** Turns what a socket reported into the session the response pane shows. */
export function applySocketEvent(session: StreamSession, event: SocketEvent): StreamSession {
  if (event.kind === 'peers') return { ...session, peers: event.peers }
  if ('message' in event) return logEvent(session, event.kind, { at: event.at, data: event.message })
  const data = new TextDecoder().decode(event.bytes)
  return logEvent(session, event.kind, { at: event.at, data, peer: event.peer, bytes: event.bytes })
}
