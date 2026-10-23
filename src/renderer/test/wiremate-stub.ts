import { vi } from 'vitest'
import type { WireMateApi } from '@shared/ipc'
import { executeScript, type Evaluate } from '@shared/scripting/script-host'
import type { HttpResult, WireRequest } from '@shared/types/http'
import type { ScriptRun } from '@shared/types/scripting'

/** A `window.wiremate` bridge whose methods are mocks; pass overrides for the ones a test cares about. */
export function createWireMateStub(overrides: Partial<WireMateApi> = {}): WireMateApi {
  return {
    platform: 'darwin',
    selectFolder: vi.fn().mockResolvedValue(null),
    sendHttp: vi.fn(),
    runScript: vi.fn(),
    ...overrides
  }
}

/** Runs scripts in the test realm. Main uses node:vm, which the renderer cannot import. */
export const functionEvaluate: Evaluate = (code, globals) => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const script = new Function(...Object.keys(globals), `return ${code}`) as (...args: unknown[]) => unknown
  return script(...Object.values(globals))
}

/** Echoes the request back as JSON, like httpbin, with a 200 status. */
export function echoResponse(request: WireRequest): HttpResult {
  const body = JSON.stringify({
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body
  })
  const headers = [
    { key: 'content-type', value: 'application/json' },
    { key: 'x-echo', value: 'yes' }
  ]
  return {
    kind: 'response',
    status: 200,
    statusText: 'OK',
    headers,
    body,
    sizeBytes: body.length,
    timings: { firstByteMs: 12, totalMs: 34 }
  }
}

/** Installs a bridge that answers HTTP with `respond` (echo by default) and runs scripts for real. */
export function installBridge(respond: (request: WireRequest) => HttpResult = echoResponse): WireMateApi {
  const bridge = createWireMateStub({
    sendHttp: vi.fn((request: WireRequest) => Promise.resolve(respond(request))),
    runScript: vi.fn((run: ScriptRun) => executeScript(run, functionEvaluate))
  })
  window.wiremate = bridge
  return bridge
}
