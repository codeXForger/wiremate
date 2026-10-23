import type { WireFailure, WireResponse } from '@shared/types/http'
import type { ExchangeResponse } from '@shared/types/response'
import type { TestResult } from '@shared/types/scripting'
import { createKeyValue } from '@shared/utils/key-value'

export function toExchange(response: WireResponse, tests: TestResult[]): ExchangeResponse {
  return {
    kind: 'exchange',
    status: response.status,
    statusText: response.statusText,
    durationMs: response.timings.totalMs,
    firstByteMs: response.timings.firstByteMs,
    sizeBytes: response.sizeBytes,
    headers: response.headers.map(({ key, value }) => createKeyValue(key, value)),
    body: response.body,
    tests,
    simulated: false
  }
}

export function toFailedExchange(failure: WireFailure, tests: TestResult[]): ExchangeResponse {
  const meta = { durationMs: failure.durationMs, sizeBytes: 0, headers: [], body: '', tests, simulated: false }
  return { kind: 'exchange', status: 0, statusText: 'Error', error: failure.error, ...meta }
}
