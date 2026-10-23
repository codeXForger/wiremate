import { vi } from 'vitest'
import type { WireMateApi } from '@shared/ipc'
import { cancelledResult } from '@shared/http/cancelled'
import { executeScript, type Evaluate } from '@shared/scripting/script-host'
import type { HttpResult, WireRequest } from '@shared/types/http'
import type { ScriptRun } from '@shared/types/scripting'

/** A `window.wiremate` bridge whose methods are mocks; pass overrides for the ones a test cares about. */
export function createWireMateStub(overrides: Partial<WireMateApi> = {}): WireMateApi {
  return {
    platform: 'darwin',
    selectFolder: vi.fn().mockResolvedValue(null),
    sendHttp: vi.fn(),
    cancelHttp: vi.fn().mockResolvedValue(undefined),
    onBeforeClose: vi.fn(),
    runScript: vi.fn(),
    listWorkspaces: vi.fn().mockResolvedValue([]),
    createWorkspace: vi.fn(),
    openWorkspace: vi.fn(),
    saveTree: vi.fn().mockResolvedValue(undefined),
    saveRequest: vi.fn().mockResolvedValue(undefined),
    deleteRequest: vi.fn().mockResolvedValue(undefined),
    saveEnvironment: vi.fn().mockResolvedValue(undefined),
    deleteEnvironment: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    listSuites: vi.fn().mockResolvedValue([]),
    saveSuite: vi.fn().mockResolvedValue(undefined),
    deleteSuite: vi.fn().mockResolvedValue(undefined),
    listRuns: vi.fn().mockResolvedValue([]),
    saveRun: vi.fn().mockResolvedValue(undefined),
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

export type Responder = (request: WireRequest) => HttpResult | Promise<HttpResult>

/**
 * Installs a bridge that answers HTTP with `respond` (echo by default) and runs scripts for real.
 * `cancelHttp` settles a pending send as cancelled, like the main process does.
 */
export function installBridge(respond: Responder = echoResponse): WireMateApi {
  const cancels = new Map<string, () => void>()
  const sendHttp = (request: WireRequest, transferId?: string): Promise<HttpResult> =>
    new Promise((resolve) => {
      if (transferId) cancels.set(transferId, () => resolve(cancelledResult(5)))
      void Promise.resolve(respond(request)).then(resolve)
    })
  const bridge = createWireMateStub({
    sendHttp: vi.fn(sendHttp),
    cancelHttp: vi.fn((transferId: string) => Promise.resolve(cancels.get(transferId)?.())),
    runScript: vi.fn((run: ScriptRun) => executeScript(run, functionEvaluate))
  })
  window.wiremate = bridge
  return bridge
}
