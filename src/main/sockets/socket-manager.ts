import type { SocketEvent, SocketEventBody, SocketSpec } from '@shared/types/socket'
import { errorMessage } from '@shared/scripting/describe'
import type { Emit, SocketSession } from './socket-session'
import { TcpClientSession } from './tcp-client-session'
import { TcpServerSession } from './tcp-server-session'
import { UdpSession } from './udp-session'

export type SocketSink = (event: SocketEvent) => void

export type SocketKind = 'TCP client' | 'TCP server' | 'UDP socket'

function kindOf(spec: SocketSpec): SocketKind {
  if (spec.protocol === 'udp') return 'UDP socket'
  return spec.config.mode === 'server' ? 'TCP server' : 'TCP client'
}

function createSession(spec: SocketSpec, emit: Emit): SocketSession {
  if (spec.protocol === 'udp') return new UdpSession(spec.config, emit)
  return spec.config.mode === 'server'
    ? new TcpServerSession(spec.config, emit)
    : new TcpClientSession(spec.config, emit)
}

/** Keeps the open sockets by session id, and forgets each one once it has closed. */
export class SocketManager {
  private readonly sessions = new Map<string, SocketSession>()
  private readonly kinds = new Map<string, SocketKind>()

  public constructor(private readonly now: () => number = Date.now) {}

  public open(sessionId: string, spec: SocketSpec, sink: SocketSink): void {
    const emit: Emit = (body) => {
      if (body.kind === 'close') this.forget(sessionId)
      sink(this.stamp(sessionId, body))
    }
    try {
      this.sessions.set(sessionId, createSession(spec, emit))
      this.kinds.set(sessionId, kindOf(spec))
    } catch (error) {
      emit({ kind: 'error', message: errorMessage(error) })
      emit({ kind: 'close', message: 'Could not open the socket' })
    }
  }

  public send(sessionId: string, bytes: Uint8Array, to?: string): void {
    this.sessions.get(sessionId)?.send(bytes, to)
  }

  public close(sessionId: string): void {
    this.sessions.get(sessionId)?.close()
  }

  /** How many sockets are open (or opening), by kind. */
  public openKinds(): SocketKind[] {
    return [...this.kinds.values()]
  }

  public closeAll(): void {
    this.sessions.forEach((session) => session.close())
  }

  private forget(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.kinds.delete(sessionId)
  }

  private stamp(sessionId: string, body: SocketEventBody): SocketEvent {
    return { ...body, sessionId, at: this.now() }
  }
}
