import type { SocketApi } from '@shared/ipc'
import { errorMessage } from '@shared/scripting/describe'
import type { StreamSession } from '@shared/types/response'
import type { SocketEvent, SocketSpec } from '@shared/types/socket'
import { createId } from '@shared/utils/id'
import { appendEvent, applySocketEvent, emptySession } from './socket-events'

/** Where sessions are shown, by request id. */
export interface SocketSessionStore {
  get(requestId: string): StreamSession | undefined
  set(requestId: string, session: StreamSession): void
}

interface SocketServiceDeps {
  /** Read on each call, so a bridge installed later (tests) is picked up. */
  bridge: () => SocketApi | undefined
  store: SocketSessionStore
  now?: () => number
}

const NO_BRIDGE = 'Sockets need the desktop app: the bridge to the main process is not available'

/**
 * Opens real sockets through the main process, one session per request, and turns their events into the stream
 * sessions the response pane shows. Each open gets a fresh session id, so late events of a replaced socket are ignored.
 */
export class SocketService {
  private readonly requestBySession = new Map<string, string>()
  private readonly sessionByRequest = new Map<string, string>()
  /** The bridge whose events this service receives. */
  private listeningTo: SocketApi | undefined

  public constructor(private readonly deps: SocketServiceDeps) {}

  public async open(requestId: string, spec: SocketSpec): Promise<void> {
    const bridge = this.deps.bridge()
    if (!bridge) {
      this.report(requestId, NO_BRIDGE)
      return
    }
    await this.replace(requestId, bridge)
    const sessionId = createId('sock')
    this.track(requestId, sessionId)
    this.listen(bridge)
    this.update(requestId, (session) => ({ ...session, connecting: true }))
    await this.call(requestId, () => bridge.openSocket(sessionId, spec))
  }

  public async send(requestId: string, bytes: Uint8Array, to?: string): Promise<void> {
    const sessionId = this.sessionByRequest.get(requestId)
    const bridge = this.deps.bridge()
    if (sessionId && bridge) await this.call(requestId, () => bridge.sendSocket(sessionId, bytes, to))
  }

  public async close(requestId: string): Promise<void> {
    const sessionId = this.sessionByRequest.get(requestId)
    const bridge = this.deps.bridge()
    if (sessionId && bridge) await this.call(requestId, () => bridge.closeSocket(sessionId))
  }

  /** True while the request's socket is open or opening. */
  public isOpen(requestId: string): boolean {
    return this.sessionByRequest.has(requestId)
  }

  /** Closes the sockets of requests that no longer exist. */
  public retain(requestIds: ReadonlySet<string>): void {
    const bridge = this.deps.bridge()
    if (!bridge) return
    ;[...this.sessionByRequest.keys()]
      .filter((id) => !requestIds.has(id))
      .forEach((id) => void this.replace(id, bridge))
  }

  /** Shows a problem found before anything reached the socket, e.g. a malformed hex payload. */
  public report(requestId: string, message: string): void {
    const event = { id: createId('evt'), direction: 'error' as const, at: this.now(), data: message }
    this.update(requestId, (session) => appendEvent({ ...session, connecting: false }, event))
  }

  private async replace(requestId: string, bridge: SocketApi): Promise<void> {
    const sessionId = this.sessionByRequest.get(requestId)
    if (!sessionId) return
    this.untrack(sessionId)
    await bridge.closeSocket(sessionId).catch(() => undefined)
  }

  private async call(requestId: string, action: () => Promise<void>): Promise<void> {
    try {
      await action()
    } catch (error) {
      this.report(requestId, errorMessage(error))
    }
  }

  private track(requestId: string, sessionId: string): void {
    this.requestBySession.set(sessionId, requestId)
    this.sessionByRequest.set(requestId, sessionId)
  }

  private listen(bridge: SocketApi): void {
    if (this.listeningTo === bridge) return
    this.listeningTo = bridge
    bridge.onSocketEvent((event) => this.receive(event))
  }

  private untrack(sessionId: string): void {
    const requestId = this.requestBySession.get(sessionId)
    this.requestBySession.delete(sessionId)
    if (requestId && this.sessionByRequest.get(requestId) === sessionId) this.sessionByRequest.delete(requestId)
  }

  private receive(event: SocketEvent): void {
    const requestId = this.requestBySession.get(event.sessionId)
    if (!requestId) return
    if (event.kind === 'close') this.untrack(event.sessionId)
    this.update(requestId, (session) => applySocketEvent(session, event))
  }

  private update(requestId: string, change: (session: StreamSession) => StreamSession): void {
    this.deps.store.set(requestId, change(this.deps.store.get(requestId) ?? emptySession()))
  }

  private now(): number {
    return (this.deps.now ?? Date.now)()
  }
}
