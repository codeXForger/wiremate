import type { HttpResult, WireRequest } from './types/http'
import type { ScriptOutcome, ScriptRun } from './types/scripting'

export const IpcChannel = {
  selectFolder: 'dialog:select-folder',
  sendHttp: 'http:send',
  runScript: 'script:run'
} as const

export interface WireMateApi {
  readonly platform: string
  selectFolder(): Promise<string | null>
  sendHttp(request: WireRequest): Promise<HttpResult>
  runScript(run: ScriptRun): Promise<ScriptOutcome>
}
