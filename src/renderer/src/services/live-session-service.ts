import { errorMessage } from '@shared/scripting/describe'
import type { StreamSession } from '@shared/types/response'
import { createId } from '@shared/utils/id'
import { appendEvent, emptySession } from './socket-events'

/** Where sessions are shown, by request id. */
export interface SessionStore {
  get(requestId: string): StreamSession | undefined
  set(requestId: string, session: StreamSession): void
}

/** How a kind of live session reaches the main process. */
export interface SessionChannel<Api, Spec, Out, Event extends { sessionId: string; kind: string }> {
  open(api: Api, sessionId: string, spec: Spec): Promise<void>
  send(api: Api, sessionId: string, message: Out): Promise<void>
  close(api: Api, sessionId: string): Promise<void>
  subscribe(api: Api, listener: (event: Event) => void): () => void
  /** Turns an event into the session the response pane shows. */
  apply(session: StreamSession, event: Event): StreamSession
  /** What to say when there is no bridge to the main process (a plain browser). */
  noBridge: string
  /** Starts every session id, e.g. `sock`. */
  idPrefix: string
}

export interface LiveSessionDeps<Api> {
  /** Read on each call, so a bridge installed later (tests) is picked up. */
  bridge: () => Api | undefined
  store: SessionStore
  now?: () => number
}

/**
 * Opens live sessions (sockets, Kafka clients) through the main process, one per request, and turns their events
 * into the stream sessions the response pane shows. Each open gets a fresh session id, so late events of a replaced
 * session are ignored.
 */
export class LiveSessionService<Api, Spec, Out, Event extends { sessionId: string; kind: string }> {
  private readonly requestBySession = new Map<string, string>()
  private readonly sessionByRequest = new Map<string, string>()
  /** The bridge whose events this service receives. */
  private listeningTo: Api | undefined

  public constructor(
    private readonly channel: SessionChannel<Api, Spec, Out, Event>,
    private readonly deps: LiveSessionDeps<Api>
  ) {}

  public async open(requestId: string, spec: Spec): Promise<void> {
    const bridge = this.deps.bridge()
    if (!bridge) {
      this.report(requestId, this.channel.noBridge)
      return
    }
    await this.replace(requestId, bridge)
    const sessionId = createId(this.channel.idPrefix)
    this.track(requestId, sessionId)
    this.listen(bridge)
    this.update(requestId, (session) => ({ ...session, connecting: true }))
    await this.call(requestId, () => this.channel.open(bridge, sessionId, spec))
  }

  public async send(requestId: string, message: Out): Promise<void> {
    const sessionId = this.sessionByRequest.get(requestId)
    const bridge = this.deps.bridge()
    if (sessionId && bridge) await this.call(requestId, () => this.channel.send(bridge, sessionId, message))
  }

  public async close(requestId: string): Promise<void> {
    const sessionId = this.sessionByRequest.get(requestId)
    const bridge = this.deps.bridge()
    if (sessionId && bridge) await this.call(requestId, () => this.channel.close(bridge, sessionId))
  }

  /** True while the request's session is open or opening. */
  public isOpen(requestId: string): boolean {
    return this.sessionByRequest.has(requestId)
  }

  /** Closes the sessions of requests that no longer exist. */
  public retain(requestIds: ReadonlySet<string>): void {
    const bridge = this.deps.bridge()
    if (!bridge) return
    ;[...this.sessionByRequest.keys()]
      .filter((id) => !requestIds.has(id))
      .forEach((id) => void this.replace(id, bridge))
  }

  /** Shows a problem found before anything reached the session, e.g. a malformed payload. */
  public report(requestId: string, message: string): void {
    const event = { id: createId('evt'), direction: 'error' as const, at: this.now(), data: message }
    this.update(requestId, (session) => appendEvent({ ...session, connecting: false }, event))
  }

  private async replace(requestId: string, bridge: Api): Promise<void> {
    const sessionId = this.sessionByRequest.get(requestId)
    if (!sessionId) return
    this.untrack(sessionId)
    await this.channel.close(bridge, sessionId).catch(() => undefined)
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

  private listen(bridge: Api): void {
    if (this.listeningTo === bridge) return
    this.listeningTo = bridge
    this.channel.subscribe(bridge, (event) => this.receive(event))
  }

  private untrack(sessionId: string): void {
    const requestId = this.requestBySession.get(sessionId)
    this.requestBySession.delete(sessionId)
    if (requestId && this.sessionByRequest.get(requestId) === sessionId) this.sessionByRequest.delete(requestId)
  }

  private receive(event: Event): void {
    const requestId = this.requestBySession.get(event.sessionId)
    if (!requestId) return
    if (event.kind === 'close') this.untrack(event.sessionId)
    this.update(requestId, (session) => this.channel.apply(session, event))
  }

  private update(requestId: string, change: (session: StreamSession) => StreamSession): void {
    this.deps.store.set(requestId, change(this.deps.store.get(requestId) ?? emptySession()))
  }

  private now(): number {
    return (this.deps.now ?? Date.now)()
  }
}
