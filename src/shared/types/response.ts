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

export type StreamDirection = 'in' | 'out' | 'system' | 'error'

export interface StreamEvent {
  id: string
  direction: StreamDirection
  at: number
  data: string
  /** The other end, for traffic on a socket that talks to several (`host:port`). */
  peer?: string
  /** The raw bytes, when the event carried binary data; `data` holds them decoded as UTF-8. */
  bytes?: Uint8Array
}

export interface StreamSession {
  kind: 'stream'
  connected: boolean
  events: StreamEvent[]
  /** Opening, not yet connected or listening. */
  connecting?: boolean
  /** Who the session talks to: a server's clients, or the hosts a UDP socket heard from. */
  peers?: string[]
}

export type ResponseState = ExchangeResponse | StreamSession
