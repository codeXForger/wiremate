import type { KeyValue } from './protocol'

export interface ExchangeResponse {
  kind: 'exchange'
  status: number
  statusText: string
  durationMs: number
  sizeBytes: number
  headers: KeyValue[]
  body: string
}

export type StreamDirection = 'in' | 'out' | 'system'

export interface StreamEvent {
  id: string
  direction: StreamDirection
  at: number
  data: string
}

export interface StreamSession {
  kind: 'stream'
  connected: boolean
  events: StreamEvent[]
}

export type ResponseState = ExchangeResponse | StreamSession
