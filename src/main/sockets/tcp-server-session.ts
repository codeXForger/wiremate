import { createServer, type Server, type Socket } from 'node:net'
import type { TcpConfig } from '@shared/types/protocol'
import { formatAddress } from '@shared/utils/payload'
import { TcpConnection, type Emit, type SocketSession } from './socket-session'

/** A TCP server: listens, accepts clients, and sends to one of them or to all. */
export class TcpServerSession implements SocketSession {
  private readonly server: Server
  private readonly clients = new Map<string, Socket>()

  public constructor(
    private readonly config: TcpConfig,
    private readonly emit: Emit
  ) {
    this.server = createServer((socket) => this.accept(socket))
    if (config.options.maxConnections > 0) this.server.maxConnections = config.options.maxConnections
    this.server.on('error', (error) => this.failed(error))
    this.server.on('close', () => this.emit({ kind: 'close', message: 'Stopped listening' }))
    this.server.listen({ host: config.host, port: config.port }, () => this.listening())
  }

  public send(bytes: Uint8Array, to?: string): void {
    const targets = to ? [this.clients.get(to)] : [...this.clients.values()]
    if (targets.length === 0) this.emit({ kind: 'error', message: 'No client is connected' })
    targets.forEach((socket) => {
      if (socket) TcpConnection.write(socket, bytes, this.emit)
      else this.emit({ kind: 'error', message: `${String(to)} is no longer connected` })
    })
  }

  public close(): void {
    this.clients.forEach((socket) => socket.destroy())
    if (this.server.listening) this.server.close()
  }

  private listening(): void {
    const address = this.server.address()
    const where = typeof address === 'object' && address ? formatAddress(address.address, address.port) : ''
    this.emit({ kind: 'open', message: `Listening on ${where}` })
  }

  private failed(error: Error): void {
    this.emit({ kind: 'error', message: error.message })
    if (!this.server.listening) this.emit({ kind: 'close', message: 'Not listening' })
  }

  private accept(socket: Socket): void {
    const peer = TcpConnection.peerOf(socket)
    this.clients.set(peer, socket)
    TcpConnection.attach(socket, this.config.options, this.emit)
    socket.on('error', (error) => this.emit({ kind: 'error', message: `${peer}: ${error.message}` }))
    socket.once('close', () => this.dropped(peer))
    this.emit({ kind: 'info', message: `${peer} connected` })
    this.emitPeers()
  }

  private dropped(peer: string): void {
    this.clients.delete(peer)
    this.emit({ kind: 'info', message: `${peer} disconnected` })
    this.emitPeers()
  }

  private emitPeers(): void {
    this.emit({ kind: 'peers', peers: [...this.clients.keys()] })
  }
}
