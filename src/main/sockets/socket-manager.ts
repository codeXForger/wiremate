import type { SocketEventBody, SocketSpec } from '@shared/types/socket'
import { SessionManager } from '../sessions/session-manager'
import type { Emit, SocketSession } from './socket-session'
import { TcpClientSession } from './tcp-client-session'
import { TcpServerSession } from './tcp-server-session'
import { UdpSession } from './udp-session'

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
export class SocketManager extends SessionManager<SocketSpec, SocketEventBody, SocketSession> {
  private readonly kinds = new Map<string, SocketKind>()

  public constructor(now: () => number = Date.now) {
    super({ create: createSession, failure: 'Could not open the socket', now })
  }

  public send(sessionId: string, bytes: Uint8Array, to?: string): void {
    this.session(sessionId)?.send(bytes, to)
  }

  /** How many sockets are open (or opening), by kind. */
  public openKinds(): SocketKind[] {
    return [...this.kinds.values()]
  }

  protected override opened(sessionId: string, spec: SocketSpec): void {
    this.kinds.set(sessionId, kindOf(spec))
  }

  protected override forget(sessionId: string): void {
    super.forget(sessionId)
    this.kinds.delete(sessionId)
  }
}
