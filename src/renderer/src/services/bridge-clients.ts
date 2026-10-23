import { errorMessage } from '@shared/scripting/describe'
import type { HttpResult, WireRequest } from '@shared/types/http'
import type { ScriptOutcome, ScriptRun } from '@shared/types/scripting'
import type { HttpTransport, ScriptExecutor } from './request-pipeline'

const NO_BRIDGE = 'The desktop bridge is not available'

/** Sends requests through the main process (no CORS there). */
export class BridgeHttpTransport implements HttpTransport {
  public async send(request: WireRequest): Promise<HttpResult> {
    try {
      if (!window.wiremate) throw new Error(NO_BRIDGE)
      return await window.wiremate.sendHttp(request)
    } catch (error) {
      return { kind: 'error', error: errorMessage(error), durationMs: 0 }
    }
  }
}

/** Runs scripts in a worker thread of the main process. */
export class BridgeScriptExecutor implements ScriptExecutor {
  public async run(run: ScriptRun): Promise<ScriptOutcome> {
    try {
      if (!window.wiremate) throw new Error(NO_BRIDGE)
      return await window.wiremate.runScript(run)
    } catch (error) {
      return { request: run.request, variables: run.variables, tests: [], logs: [], error: errorMessage(error) }
    }
  }
}
