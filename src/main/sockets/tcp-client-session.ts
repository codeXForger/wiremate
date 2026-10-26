import { Socket } from 'node:net'
import type { TcpConfig } from '@shared/types/protocol'
import { formatAddress } from '@shared/utils/payload'
import { TcpConnection, type Emit, type SocketSession } from './socket-session'

/** Waits this long for a polite close before dropping the connection. */
const CLOSE_GRACE_MS = 1000

/** A TCP client: connects to a server, then sends and receives raw bytes. */
export class TcpClientSession implements SocketSession {
  private readonly socket = new Socket()
  private readonly target: string

  public constructor(
    private readonly config: TcpConfig,
    private readonly emit: Emit
  ) {
    this.target = formatAddress(config.host, config.port)
    this.watch()
    this.connect()
  }

  public send(bytes: Uint8Array): void {
    TcpConnection.write(this.socket, bytes, this.emit)
  }

  public close(): void {
    if (this.socket.connecting) return void this.socket.destroy()
    this.socket.end()
    setTimeout(() => this.socket.destroy(), CLOSE_GRACE_MS).unref()
  }

  private watch(): void {
    this.socket.on('error', (error) => this.emit({ kind: 'error', message: error.message }))
    this.socket.on('end', () => this.emit({ kind: 'info', message: `${this.target} closed the connection` }))
    this.socket.once('close', () => this.emit({ kind: 'close', message: 'Disconnected' }))
  }

  private connect(): void {
    const { host, port, options } = this.config
    this.emit({ kind: 'info', message: `Connecting to ${this.target}…` })
    const timer = this.startConnectTimer(options.connectTimeoutMs)
    this.socket.connect({ host, port }, () => {
      clearTimeout(timer)
      TcpConnection.attach(this.socket, options, this.emit)
      const local = formatAddress(this.socket.localAddress ?? '?', this.socket.localPort ?? 0)
      this.emit({ kind: 'open', message: `Connected to ${this.target} from ${local}` })
    })
  }

  private startConnectTimer(timeoutMs: number): NodeJS.Timeout | undefined {
    if (timeoutMs <= 0) return undefined
    const timeout = new Error(`No connection to ${this.target} after ${timeoutMs} ms`)
    return setTimeout(() => this.socket.destroy(timeout), timeoutMs)
  }
}
