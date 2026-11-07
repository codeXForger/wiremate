import { errorMessage } from '@shared/scripting/describe'

/** What every session says about itself: it opened, something to know, something failed, it closed. */
export interface LifecycleBody {
  kind: 'open' | 'info' | 'error' | 'close'
  message: string
}

/** A connection the main process keeps open for the renderer: a socket, a Kafka producer or consumer. */
export interface LiveSession {
  close(): void
}

/** An event on its way to the renderer, tagged with its session and time. */
export type Stamped<B> = B & { sessionId: string; at: number }

export type SessionSink<B> = (event: Stamped<B>) => void

interface SessionManagerOptions<Spec, Body, S> {
  /** Opens a session; it reports through `emit` and must emit `close` once it has closed. */
  create: (spec: Spec, emit: (body: Body | LifecycleBody) => void) => S
  /** The close reason when `create` throws. */
  failure: string
  now?: () => number
}

/** Keeps the open sessions by id, and forgets each one once it has closed. */
export class SessionManager<Spec, Body extends { kind: string }, S extends LiveSession> {
  private readonly sessions = new Map<string, S>()

  public constructor(private readonly options: SessionManagerOptions<Spec, Body, S>) {}

  public open(sessionId: string, spec: Spec, sink: SessionSink<Body | LifecycleBody>): void {
    const now = this.options.now ?? Date.now
    const emit = (body: Body | LifecycleBody): void => {
      if (body.kind === 'close') this.forget(sessionId)
      sink({ ...body, sessionId, at: now() })
    }
    try {
      this.sessions.set(sessionId, this.options.create(spec, emit))
      this.opened(sessionId, spec)
    } catch (error) {
      emit({ kind: 'error', message: errorMessage(error) })
      emit({ kind: 'close', message: this.options.failure })
    }
  }

  public close(sessionId: string): void {
    this.sessions.get(sessionId)?.close()
  }

  public closeAll(): void {
    this.sessions.forEach((session) => session.close())
  }

  protected session(sessionId: string): S | undefined {
    return this.sessions.get(sessionId)
  }

  /** Called once a session was created, e.g. to note what kind it is. */
  protected opened(_sessionId: string, _spec: Spec): void {
    // Nothing to note by default.
  }

  protected forget(sessionId: string): void {
    this.sessions.delete(sessionId)
  }
}
