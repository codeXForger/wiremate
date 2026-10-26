import type { CategoryId } from '../protocols/categories'
import type { HttpMethod } from './protocol'

/** One request that was sent: what, where, when and how it went. */
export interface HistoryEntry {
  id: string
  category: CategoryId
  /** When it was sent. */
  at: number
  requestId: string
  requestName: string
  method: HttpMethod
  /** The URL as it was sent, with `{{variables}}` filled in. */
  url: string
  environmentName: string | null
  /** 0 when there was no response. */
  status: number
  statusText: string
  durationMs: number
  sizeBytes: number
  testsPassed: number
  testsFailed: number
  /** Network failure or cancellation. */
  error?: string
}
