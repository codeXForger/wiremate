import type { HttpResult, WireRequest } from './types/http'
import type { ScriptOutcome, ScriptRun } from './types/scripting'
import type { SuiteRun, TestSuite } from './types/suite'

export const IpcChannel = {
  selectFolder: 'dialog:select-folder',
  sendHttp: 'http:send',
  runScript: 'script:run',
  listSuites: 'suites:list',
  saveSuite: 'suites:save',
  deleteSuite: 'suites:delete',
  listRuns: 'runs:list',
  saveRun: 'runs:save'
} as const

/** Suites and runs live in the workspace folder, so every call names it. */
export interface SuiteStorageApi {
  listSuites(workspacePath: string): Promise<TestSuite[]>
  saveSuite(workspacePath: string, suite: TestSuite): Promise<void>
  deleteSuite(workspacePath: string, suiteId: string): Promise<void>
  listRuns(workspacePath: string, suiteId: string): Promise<SuiteRun[]>
  saveRun(workspacePath: string, run: SuiteRun): Promise<void>
}

export interface WireMateApi extends SuiteStorageApi {
  readonly platform: string
  selectFolder(): Promise<string | null>
  sendHttp(request: WireRequest): Promise<HttpResult>
  runScript(run: ScriptRun): Promise<ScriptOutcome>
}
