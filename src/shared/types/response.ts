import type { KeyValue } from './protocol'
import type { TestResult } from './scripting'

export interface ExchangeResponse {
  kind: 'exchange'
  status: number
  statusText: string
  durationMs: number
  sizeBytes: number
  headers: KeyValue[]
  body: string
  /** Time until the headers arrived, when the response came over the network. */
  firstByteMs?: number
  /** Set when the request never got a response (DNS, refused connection, timeout). */
  error?: string
  cancelled?: boolean
  tests: TestResult[]
  /** Scripts that threw, e.g. "Post-response script failed: …"; tests after the error did not run. */
  scriptErrors?: string[]
  simulated: boolean
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
