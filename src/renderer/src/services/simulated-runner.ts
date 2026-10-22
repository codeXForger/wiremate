import type { AnyRequest } from '@shared/types/protocol'
import type { ExchangeResponse, StreamDirection, StreamEvent, StreamSession } from '@shared/types/response'
import { createId } from '@shared/utils/id'
import { createKeyValue } from '@shared/utils/key-value'

const SIMULATED_LATENCY_MS = 48

/**
 * Produces stand-in responses so the UI can be exercised before real protocol clients exist.
 * Each protocol branch replaces this with a real runner behind the same shape.
 */
export class SimulatedRunner {
  public constructor(private readonly now: () => number = Date.now) {}

  public exchange(request: AnyRequest): ExchangeResponse {
    const echo = { simulated: true, protocol: request.protocol, request: request.config }
    const body = JSON.stringify(echo, null, 2)
    const headers = [createKeyValue('content-type', 'application/json'), createKeyValue('x-wiremate', 'simulated')]
    const sizeBytes = new TextEncoder().encode(body).length
    const durationMs = SIMULATED_LATENCY_MS
    return { kind: 'exchange', status: 200, statusText: 'OK', durationMs, sizeBytes, headers, body }
  }

  public connect(target: string): StreamSession {
    return {
      kind: 'stream',
      connected: true,
      events: [this.event('system', `Connected to ${target} (simulated)`)]
    }
  }

  public disconnect(session: StreamSession): StreamSession {
    return {
      ...session,
      connected: false,
      events: [...session.events, this.event('system', 'Disconnected')]
    }
  }

  public send(session: StreamSession, payload: string): StreamSession {
    const events = [this.event('out', payload), this.event('in', payload)]
    return { ...session, events: [...session.events, ...events] }
  }

  private event(direction: StreamDirection, data: string): StreamEvent {
    return { id: createId('evt'), direction, at: this.now(), data }
  }
}
