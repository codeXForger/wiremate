import { createSocket, type RemoteInfo, type Socket, type SocketOptions } from 'node:dgram'
import type { UdpConfig } from '@shared/types/protocol'
import { errorMessage } from '@shared/scripting/describe'
import { formatAddress, parseAddress } from '@shared/utils/payload'
import type { Emit, SocketSession } from './socket-session'

function socketOptions({ options }: UdpConfig): SocketOptions {
  const sizes = {
    ...(options.recvBufferSize > 0 && { recvBufferSize: options.recvBufferSize }),
    ...(options.sendBufferSize > 0 && { sendBufferSize: options.sendBufferSize })
  }
  return { type: options.ipv6 ? 'udp6' : 'udp4', reuseAddr: options.reuseAddr, ...sizes }
}

/** A UDP socket: listens on a port and sends datagrams to a host, the broadcast address or a multicast group. */
export class UdpSession implements SocketSession {
  private readonly socket: Socket
  private readonly peers = new Set<string>()
  private bound = false

  public constructor(
    private readonly config: UdpConfig,
    private readonly emit: Emit
  ) {
    this.socket = createSocket(socketOptions(config))
    this.socket.on('message', (message, remote) => this.received(message, remote))
    this.socket.on('error', (error) => this.failed(error))
    this.socket.on('close', () => this.emit({ kind: 'close', message: 'Socket closed' }))
    this.socket.bind(this.bindAddress(), () => this.ready())
  }

  public send(bytes: Uint8Array, to?: string): void {
    const { host, port } = to ? parseAddress(to) : this.destination()
    const peer = formatAddress(host, port)
    this.socket.send(bytes, port, host, (error) => {
      if (error) this.emit({ kind: 'error', message: `${peer}: ${error.message}` })
      else this.emit({ kind: 'out', peer, bytes })
    })
  }

  public close(): void {
    this.socket.close()
  }

  private bindAddress(): { port: number; address?: string } {
    const { mode, localAddress, localPort, port } = this.config
    if (mode === 'multicast') return { port }
    return { port: localPort, ...(localAddress && { address: localAddress }) }
  }

  private destination(): { host: string; port: number } {
    const { mode, group, host, port } = this.config
    return { host: mode === 'multicast' ? group : host, port }
  }

  private ready(): void {
    this.bound = true
    try {
      this.configure()
    } catch (error) {
      this.emit({ kind: 'error', message: errorMessage(error) })
    }
    const { address, port } = this.socket.address()
    this.emit({ kind: 'open', message: `Listening on ${formatAddress(address, port)}${this.modeNote()}` })
  }

  private configure(): void {
    const { mode, options } = this.config
    if (mode === 'multicast') {
      this.joinGroup()
      return
    }
    this.socket.setTTL(options.ttl)
    if (mode === 'broadcast') this.socket.setBroadcast(true)
  }

  private joinGroup(): void {
    const { group, options } = this.config
    const networkInterface = options.multicastInterface || undefined
    this.socket.addMembership(group, networkInterface)
    this.socket.setMulticastTTL(options.ttl)
    this.socket.setMulticastLoopback(options.multicastLoopback)
    if (networkInterface) this.socket.setMulticastInterface(networkInterface)
  }

  private modeNote(): string {
    const { mode, group } = this.config
    if (mode === 'multicast') return `, joined ${group}`
    return mode === 'broadcast' ? ', broadcast on' : ''
  }

  private received(message: Buffer, remote: RemoteInfo): void {
    const peer = formatAddress(remote.address, remote.port)
    if (!this.peers.has(peer)) {
      this.peers.add(peer)
      this.emit({ kind: 'peers', peers: [...this.peers] })
    }
    this.emit({ kind: 'in', peer, bytes: new Uint8Array(message) })
  }

  private failed(error: Error): void {
    this.emit({ kind: 'error', message: error.message })
    if (!this.bound) this.socket.close()
  }
}
