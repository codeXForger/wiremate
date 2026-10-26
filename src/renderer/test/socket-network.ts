import type { SocketApi } from '@shared/ipc'
import type { SocketEvent, SocketEventBody, SocketSpec } from '@shared/types/socket'
import { formatAddress, parseAddress } from '@shared/utils/payload'

interface FakeSession {
  spec: SocketSpec
  /** This socket's own `host:port`. */
  address: string
  port: number
  /** TCP: the other ends, by address, to their session id. */
  links: Map<string, string>
  /** UDP: the hosts heard from. */
  heard: Set<string>
}

/**
 * An in-memory stand-in for the main process's sockets: TCP servers accept clients on their port, UDP sockets
 * receive what is sent to their port (or their multicast group). Enough to run a server and a client side by side.
 */
export class FakeSocketNetwork implements SocketApi {
  public readonly sent: { sessionId: string; bytes: Uint8Array; to?: string }[] = []
  private readonly listeners = new Set<(event: SocketEvent) => void>()
  private readonly sessions = new Map<string, FakeSession>()
  private nextPort = 50_000

  public onSocketEvent(listener: (event: SocketEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public openSocket(sessionId: string, spec: SocketSpec): Promise<void> {
    if (spec.protocol === 'udp') this.bindUdp(sessionId, spec)
    else if (spec.config.mode === 'server') this.listenTcp(sessionId, spec)
    else this.connectTcp(sessionId, spec)
    return Promise.resolve()
  }

  public sendSocket(sessionId: string, bytes: Uint8Array, to?: string): Promise<void> {
    this.sent.push({ sessionId, bytes, to })
    const session = this.sessions.get(sessionId)
    if (session?.spec.protocol === 'tcp') this.sendTcp([sessionId, session], bytes, to)
    else if (session) this.sendUdp([sessionId, session], bytes, to)
    return Promise.resolve()
  }

  public closeSocket(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return Promise.resolve()
    this.sessions.delete(sessionId)
    session.links.forEach((otherId) => this.unlink(otherId, session.address))
    this.emit(sessionId, { kind: 'close', message: 'Disconnected' })
    return Promise.resolve()
  }

  /** Every open session, e.g. to check that a deleted request's socket closed. */
  public openSessions(): string[] {
    return [...this.sessions.keys()]
  }

  private emit(sessionId: string, body: SocketEventBody): void {
    this.listeners.forEach((listener) => listener({ ...body, sessionId, at: Date.now() }))
  }

  private boundOn(port: number, protocol: 'tcp' | 'udp'): [string, FakeSession][] {
    return [...this.sessions].filter(([, s]) => s.port === port && s.spec.protocol === protocol)
  }

  private add(sessionId: string, spec: SocketSpec, port: number): FakeSession {
    const session = {
      spec,
      address: formatAddress('127.0.0.1', port),
      port,
      links: new Map(),
      heard: new Set<string>()
    }
    this.sessions.set(sessionId, session)
    return session
  }

  private refuse(sessionId: string, message: string): void {
    this.emit(sessionId, { kind: 'error', message })
    this.emit(sessionId, { kind: 'close', message: 'Not listening' })
  }

  private listenTcp(sessionId: string, spec: SocketSpec): void {
    const { host, port } = spec.config
    if (this.boundOn(port, 'tcp').some(([, s]) => s.spec.config.mode === 'server')) {
      this.refuse(sessionId, `listen EADDRINUSE: address already in use ${formatAddress(host, port)}`)
      return
    }
    this.add(sessionId, spec, port)
    this.emit(sessionId, { kind: 'open', message: `Listening on ${formatAddress(host, port)}` })
  }

  private connectTcp(sessionId: string, spec: SocketSpec): void {
    const target = formatAddress(spec.config.host, spec.config.port)
    const server = this.boundOn(spec.config.port, 'tcp').find(([, s]) => s.spec.config.mode === 'server')
    if (!server) {
      this.refuse(sessionId, `connect ECONNREFUSED ${target}`)
      return
    }
    const [serverId, serverSession] = server
    const client = this.add(sessionId, spec, this.nextPort++)
    client.links.set(target, serverId)
    serverSession.links.set(client.address, sessionId)
    this.emit(sessionId, { kind: 'open', message: `Connected to ${target} from ${client.address}` })
    this.emit(serverId, { kind: 'info', message: `${client.address} connected` })
    this.emit(serverId, { kind: 'peers', peers: [...serverSession.links.keys()] })
  }

  private unlink(otherId: string, address: string): void {
    const other = this.sessions.get(otherId)
    if (!other) return
    other.links.delete(address)
    if (other.spec.config.mode === 'server') {
      this.emit(otherId, { kind: 'info', message: `${address} disconnected` })
      this.emit(otherId, { kind: 'peers', peers: [...other.links.keys()] })
    } else void this.closeSocket(otherId)
  }

  private sendTcp([sessionId, session]: [string, FakeSession], bytes: Uint8Array, to?: string): void {
    const targets = to ? [to] : [...session.links.keys()]
    if (targets.length === 0) this.emit(sessionId, { kind: 'error', message: 'No client is connected' })
    targets.forEach((peer) => {
      const otherId = session.links.get(peer)
      if (!otherId) return
      this.emit(sessionId, { kind: 'out', peer, bytes })
      this.emit(otherId, { kind: 'in', peer: session.address, bytes })
    })
  }

  private bindUdp(sessionId: string, spec: SocketSpec & { protocol: 'udp' }): void {
    const { mode, localPort, port, group } = spec.config
    const bindPort = mode === 'multicast' ? port : localPort || this.nextPort++
    if (!spec.config.options.reuseAddr && this.boundOn(bindPort, 'udp').length > 0) {
      this.refuse(sessionId, `bind EADDRINUSE 0.0.0.0:${bindPort}`)
      return
    }
    this.add(sessionId, spec, bindPort)
    const joined = mode === 'multicast' ? `, joined ${group}` : ''
    this.emit(sessionId, { kind: 'open', message: `Listening on 0.0.0.0:${bindPort}${joined}` })
  }

  private sendUdp([sessionId, session]: [string, FakeSession], bytes: Uint8Array, to?: string): void {
    const config = session.spec.config as SocketSpec['config'] & { protocol?: never; group: string; mode: string }
    const host = config.mode === 'multicast' ? config.group : config.host
    const destination = to ?? formatAddress(host, config.port)
    this.emit(sessionId, { kind: 'out', peer: destination, bytes })
    this.boundOn(parseAddress(destination).port, 'udp')
      .filter(([otherId]) => otherId !== sessionId || config.mode === 'multicast')
      .forEach((receiver) => this.deliver(receiver, session.address, bytes))
  }

  private deliver([sessionId, session]: [string, FakeSession], from: string, bytes: Uint8Array): void {
    if (!session.heard.has(from)) {
      session.heard.add(from)
      this.emit(sessionId, { kind: 'peers', peers: [...session.heard] })
    }
    this.emit(sessionId, { kind: 'in', peer: from, bytes })
  }
}

/** Installs the fake network on the current `window.wiremate` bridge. */
export function installSocketNetwork(): FakeSocketNetwork {
  const network = new FakeSocketNetwork()
  if (!window.wiremate) throw new Error('Install a bridge first')
  Object.assign(window.wiremate, {
    openSocket: network.openSocket.bind(network),
    sendSocket: network.sendSocket.bind(network),
    closeSocket: network.closeSocket.bind(network),
    onSocketEvent: network.onSocketEvent.bind(network)
  })
  return network
}
