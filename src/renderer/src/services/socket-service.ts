import type { SocketApi } from '@shared/ipc'
import type { SocketEvent, SocketSpec } from '@shared/types/socket'
import { LiveSessionService, type LiveSessionDeps, type SessionStore } from './live-session-service'
import { applySocketEvent } from './socket-events'

export type SocketSessionStore = SessionStore

interface Outgoing {
  bytes: Uint8Array
  to?: string
}

/** Real TCP and UDP sockets, opened through the main process, one per request. */
export class SocketService extends LiveSessionService<SocketApi, SocketSpec, Outgoing, SocketEvent> {
  public constructor(deps: LiveSessionDeps<SocketApi>) {
    super(
      {
        open: (api, sessionId, spec) => api.openSocket(sessionId, spec),
        send: (api, sessionId, { bytes, to }) => api.sendSocket(sessionId, bytes, to),
        close: (api, sessionId) => api.closeSocket(sessionId),
        subscribe: (api, listener) => api.onSocketEvent(listener),
        apply: applySocketEvent,
        idPrefix: 'sock',
        noBridge: 'Sockets need the desktop app: the bridge to the main process is not available'
      },
      deps
    )
  }

  /** `to` (`host:port`) picks one client of a server or a UDP destination. */
  public sendBytes(requestId: string, bytes: Uint8Array, to?: string): Promise<void> {
    return this.send(requestId, { bytes, to })
  }
}
