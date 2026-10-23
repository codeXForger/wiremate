import type { WireFailure } from '../types/http'

export const CANCELLED_MESSAGE = 'Request cancelled'

/** The result of a request the user cancelled before its response arrived. */
export function cancelledResult(durationMs: number): WireFailure {
  return { kind: 'error', error: CANCELLED_MESSAGE, durationMs, cancelled: true }
}
