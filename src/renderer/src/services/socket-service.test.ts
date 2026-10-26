import { describe, expect, it, vi } from 'vitest'
import type { SocketApi } from '@shared/ipc'
import { PROTOCOL_DEFAULTS } from '@shared/protocols/defaults'
import type { StreamSession } from '@shared/types/response'
import type { SocketEvent, SocketSpec } from '@shared/types/socket'
import { applySocketEvent, emptySession, MAX_SOCKET_EVENTS } from './socket-events'
import { SocketService } from './socket-service'

const spec: SocketSpec = { protocol: 'tcp', config: PROTOCOL_DEFAULTS.tcp() }

function setup(overrides: Partial<SocketApi> = {}) {
  let emit: (event: SocketEvent) => void = () => undefined
  const bridge: SocketApi = {
    openSocket: vi.fn().mockResolvedValue(undefined),
    sendSocket: vi.fn().mockResolvedValue(undefined),
    closeSocket: vi.fn().mockResolvedValue(undefined),
    onSocketEvent: vi.fn((listener: (event: SocketEvent) => void) => {
      emit = listener
      return () => undefined
    }),
    ...overrides
  }
  const sessions = new Map<string, StreamSession>()
  const service = new SocketService({
    bridge: () => bridge,
    store: { get: (id) => sessions.get(id), set: (id, session) => sessions.set(id, session) },
    now: () => 7
  })
  const sessionId = (call = 0) => vi.mocked(bridge.openSocket).mock.calls[call]![0]
  return { bridge, service, sessions, sessionId, emit: (event: SocketEvent) => emit(event) }
}

describe('SocketService', () => {
  it('ignores late events from a socket it replaced', async () => {
    const { service, sessions, sessionId, emit, bridge } = setup()
    await service.open('r1', spec)
    await service.open('r1', spec)
    expect(bridge.closeSocket).toHaveBeenCalledWith(sessionId(0))
    emit({ sessionId: sessionId(0), at: 1, kind: 'close', message: 'Disconnected' })
    emit({ sessionId: sessionId(1), at: 2, kind: 'open', message: 'Connected' })
    expect(sessions.get('r1')).toMatchObject({ connected: true, events: [{ data: 'Connected' }] })
  })

  it('stops sending once the socket has closed', async () => {
    const { service, sessionId, emit, bridge } = setup()
    await service.open('r1', spec)
    await service.send('r1', new Uint8Array([1]), '1.2.3.4:5')
    expect(bridge.sendSocket).toHaveBeenCalledWith(sessionId(), new Uint8Array([1]), '1.2.3.4:5')
    emit({ sessionId: sessionId(), at: 1, kind: 'close', message: 'Disconnected' })
    await service.send('r1', new Uint8Array([2]))
    await service.close('r1')
    expect(bridge.sendSocket).toHaveBeenCalledTimes(1)
    expect(bridge.closeSocket).not.toHaveBeenCalled()
  })

  it('shows a failing bridge call as an error', async () => {
    const { service, sessions } = setup({ openSocket: vi.fn().mockRejectedValue(new Error('IPC is down')) })
    await service.open('r1', spec)
    expect(sessions.get('r1')).toMatchObject({
      connecting: false,
      events: [{ direction: 'error', data: 'IPC is down' }]
    })
  })

  it('closes only the sockets of requests that are gone', async () => {
    const { service, sessionId, bridge } = setup()
    await service.open('keep', spec)
    await service.open('gone', spec)
    service.retain(new Set(['keep']))
    expect(bridge.closeSocket).toHaveBeenCalledExactlyOnceWith(sessionId(1))
  })

  it('does nothing without a bridge, beyond saying why', async () => {
    const sessions = new Map<string, StreamSession>()
    const service = new SocketService({
      bridge: () => undefined,
      store: { get: (id) => sessions.get(id), set: (id, session) => sessions.set(id, session) }
    })
    service.retain(new Set())
    await service.send('r1', new Uint8Array())
    await service.close('r1')
    await service.open('r1', spec)
    expect(sessions.get('r1')?.events).toMatchObject([{ direction: 'error' }])
  })
})

describe('applySocketEvent', () => {
  it('tracks peers and keeps only the newest events', () => {
    let session = applySocketEvent(emptySession(), { sessionId: 's', at: 1, kind: 'peers', peers: ['a:1'] })
    expect(session.peers).toEqual(['a:1'])
    for (let i = 0; i < MAX_SOCKET_EVENTS + 5; i++) {
      session = applySocketEvent(session, { sessionId: 's', at: i, kind: 'in', peer: 'a:1', bytes: Uint8Array.of(65) })
    }
    expect(session.events).toHaveLength(MAX_SOCKET_EVENTS)
    expect(session.events[0]).toMatchObject({ at: 5, data: 'A', peer: 'a:1' })
    session = applySocketEvent(session, { sessionId: 's', at: 9, kind: 'close', message: 'Disconnected' })
    expect(session).toMatchObject({ connected: false, peers: [] })
  })
})
