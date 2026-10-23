import type { HttpMethod } from './protocol'

export interface HeaderPair {
  key: string
  value: string
}

/** A fully resolved HTTP request, exactly as it goes over the wire. */
export interface WireRequest {
  method: HttpMethod
  url: string
  headers: HeaderPair[]
  body: string | null
}

export interface WireTimings {
  /** Time until the status line and headers arrived. */
  firstByteMs: number
  totalMs: number
}

export interface WireResponse {
  kind: 'response'
  status: number
  statusText: string
  headers: HeaderPair[]
  body: string
  sizeBytes: number
  timings: WireTimings
}

export interface WireFailure {
  kind: 'error'
  error: string
  durationMs: number
  /** Set when the user cancelled the request rather than it failing. */
  cancelled?: boolean
}

export type HttpResult = WireResponse | WireFailure
