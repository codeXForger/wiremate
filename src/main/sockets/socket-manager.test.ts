// @vitest-environment node
import { createServer, type AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { PROTOCOL_DEFAULTS } from '@shared/protocols/defaults'
import type { TcpConfig, UdpConfig } from '@shared/types/protocol'
import type { SocketEvent } from '@shared/types/socket'
import { SocketManager } from './socket-manager'

const text = (value: string) => new TextEncoder().encode(value)
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
const containing = (part: string) => expect.stringContaining(part) as string

/** Collects a session's events and waits for the ones a test expects. */
class Recorder {
  public readonly events: SocketEvent[] = []
  private waiters: (() => void)[] = []

  public readonly sink = (event: SocketEvent): void => {
    this.events.push(event)
    this.waiters.forEach((wake) => wake())
  }

  public async until(match: (event: SocketEvent) => boolean): Promise<SocketEvent> {
    for (;;) {
      const found = this.events.find(match)
      if (found) return found
      await new Promise<void>((resolve) => this.waiters.push(resolve))
    }
  }

  public kind(kind: SocketEvent['kind']): Promise<SocketEvent> {
    return this.until((event) => event.kind === kind)
  }

  public received(): string[] {
    return this.events.flatMap((event) => (event.kind === 'in' ? [decode(event.bytes)] : []))
  }
}

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  await new Promise((resolve) => server.close(resolve))
  return port
}

function tcp(patch: Partial<TcpConfig>): { protocol: 'tcp'; config: TcpConfig } {
  return { protocol: 'tcp', config: { ...PROTOCOL_DEFAULTS.tcp(), ...patch } }
}

function udp(patch: Partial<UdpConfig>): { protocol: 'udp'; config: UdpConfig } {
  return { protocol: 'udp', config: { ...PROTOCOL_DEFAULTS.udp(), ...patch } }
}

let manager: SocketManager

afterEach(() => manager.closeAll())

describe('SocketManager over TCP', () => {
  it('runs a server and a client that talk both ways', async () => {
    manager = new SocketManager()
    const port = await freePort()
    const server = new Recorder()
    const client = new Recorder()
    manager.open('server', tcp({ mode: 'server', port }), server.sink)
    await server.kind('open')
    manager.open('client', tcp({ port }), client.sink)
    const connected = await client.kind('open')
    expect(connected).toMatchObject({ sessionId: 'client', message: containing(`127.0.0.1:${port}`) })

    const peers = await server.until((event) => event.kind === 'peers' && event.peers.length === 1)
    manager.send('client', text('hello server'))
    await server.kind('in')
    expect(server.received()).toEqual(['hello server'])

    const peer = peers.kind === 'peers' ? peers.peers[0] : ''
    manager.send('server', text('hello client'), peer)
    manager.send('server', text('to everyone'))
    // TCP is a stream: the two writes may arrive as one read.
    await client.until(() => client.received().join('') === 'hello clientto everyone')
    expect(server.events.filter((event) => event.kind === 'out')).toHaveLength(2)

    manager.close('client')
    await client.kind('close')
    await server.until((event) => event.kind === 'peers' && event.peers.length === 0)
    manager.close('server')
    await server.kind('close')
  })

  it('splits received data into pieces of the buffer size', async () => {
    manager = new SocketManager()
    const port = await freePort()
    const server = new Recorder()
    const client = new Recorder()
    const options = { ...PROTOCOL_DEFAULTS.tcp().options, bufferSize: 4 }
    manager.open('server', tcp({ mode: 'server', port, options }), server.sink)
    await server.kind('open')
    manager.open('client', tcp({ port }), client.sink)
    await client.kind('open')
    manager.send('client', text('abcdefghij'))
    await server.until(() => server.received().join('') === 'abcdefghij')
    expect(server.received()).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('reports a refused connection and closes', async () => {
    manager = new SocketManager()
    const client = new Recorder()
    manager.open('client', tcp({ port: await freePort() }), client.sink)
    expect(await client.kind('error')).toMatchObject({ message: containing('ECONNREFUSED') })
    await client.kind('close')
  })

  it('reports a port that is already taken', async () => {
    manager = new SocketManager()
    const port = await freePort()
    const first = new Recorder()
    const second = new Recorder()
    manager.open('a', tcp({ mode: 'server', port }), first.sink)
    await first.kind('open')
    manager.open('b', tcp({ mode: 'server', port }), second.sink)
    expect(await second.kind('error')).toMatchObject({ message: containing('EADDRINUSE') })
    expect(await second.kind('close')).toMatchObject({ message: 'Not listening' })
  })

  it('tells a server with no clients that nobody got the message', async () => {
    manager = new SocketManager()
    const server = new Recorder()
    manager.open('server', tcp({ mode: 'server', port: await freePort() }), server.sink)
    await server.kind('open')
    manager.send('server', text('anyone?'))
    expect(await server.kind('error')).toMatchObject({ message: 'No client is connected' })
  })

  it('turns a config the socket rejects into an error and a close', async () => {
    manager = new SocketManager()
    const client = new Recorder()
    manager.open('client', tcp({ port: 70_000 }), client.sink)
    expect(await client.kind('error')).toMatchObject({ message: containing('70000') })
    await client.kind('close')
  })
})

describe('SocketManager over UDP', () => {
  it('sends datagrams between two sockets and lets the receiver reply', async () => {
    manager = new SocketManager()
    const [portA, portB] = [await freePort(), await freePort()]
    const a = new Recorder()
    const b = new Recorder()
    manager.open('a', udp({ localAddress: '127.0.0.1', localPort: portA, port: portB }), a.sink)
    manager.open('b', udp({ localAddress: '127.0.0.1', localPort: portB, port: portA }), b.sink)
    await Promise.all([a.kind('open'), b.kind('open')])

    manager.send('a', text('ping'))
    const ping = await b.kind('in')
    expect(b.received()).toEqual(['ping'])
    expect(await b.kind('peers')).toMatchObject({ peers: [`127.0.0.1:${portA}`] })

    manager.send('b', text('pong'), ping.kind === 'in' ? ping.peer : '')
    await a.kind('in')
    expect(a.received()).toEqual(['pong'])
  })

  it('turns broadcast on when it binds', async () => {
    manager = new SocketManager()
    const socket = new Recorder()
    manager.open('b', udp({ mode: 'broadcast', localPort: 0 }), socket.sink)
    expect(await socket.kind('open')).toMatchObject({ message: containing('broadcast on') })
  })

  it('reports a multicast group it cannot join', async () => {
    manager = new SocketManager()
    const socket = new Recorder()
    manager.open('m', udp({ mode: 'multicast', group: '10.0.0.1', port: await freePort() }), socket.sink)
    expect(await socket.kind('error')).toMatchObject({ message: containing('addMembership') })
  })
})
