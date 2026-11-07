import { kafkaSessions } from './kafka/kafka-actions'
import { socketSessions } from './socket/socket-actions'

/** Every service that keeps something open for a request: sockets, producers and consumers. */
const LIVE_SESSIONS = [socketSessions, kafkaSessions]

export function hasLiveSession(requestId: string): boolean {
  return LIVE_SESSIONS.some((sessions) => sessions.isOpen(requestId))
}

/** Closes what is open for requests that no longer exist. */
export function retainLiveSessions(requestIds: ReadonlySet<string>): void {
  for (const sessions of LIVE_SESSIONS) sessions.retain(requestIds)
}
