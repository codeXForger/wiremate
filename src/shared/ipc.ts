import type { HttpResult, WireRequest } from './types/http'
import type { AnyRequest } from './types/protocol'
import type { ScriptOutcome, ScriptRun } from './types/scripting'
import type { SuiteRun, TestSuite } from './types/suite'
import type {
  CreateWorkspaceInput,
  Environment,
  TreeNode,
  Workspace,
  WorkspaceContent,
  WorkspaceSettings
} from './types/workspace'

export const IpcChannel = {
  selectFolder: 'dialog:select-folder',
  sendHttp: 'http:send',
  cancelHttp: 'http:cancel',
  runScript: 'script:run',
  listWorkspaces: 'workspaces:list',
  createWorkspace: 'workspaces:create',
  openWorkspace: 'workspaces:open',
  saveTree: 'workspace:save-tree',
  saveRequest: 'workspace:save-request',
  deleteRequest: 'workspace:delete-request',
  saveEnvironment: 'workspace:save-environment',
  deleteEnvironment: 'workspace:delete-environment',
  saveSettings: 'workspace:save-settings',
  listSuites: 'suites:list',
  saveSuite: 'suites:save',
  deleteSuite: 'suites:delete',
  listRuns: 'runs:list',
  saveRun: 'runs:save',
  chooseReportFile: 'report:choose-file',
  savePdfReport: 'report:save-pdf',
  openReport: 'report:open'
} as const

/** One-way messages around closing a window: main asks, the renderer saves what is pending, then answers. */
export const AppEvent = {
  beforeClose: 'app:before-close',
  readyToClose: 'app:ready-to-close'
} as const

/**
 * Everything in a workspace folder. Workspaces are named by id; the main process maps the id to its folder.
 * `listWorkspaces` creates the default workspace on first launch.
 */
export interface WorkspaceStorageApi {
  listWorkspaces(): Promise<Workspace[]>
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>
  /** Loads the content and marks the workspace as the most recently opened. */
  openWorkspace(workspaceId: string): Promise<WorkspaceContent>
  saveTree(workspaceId: string, nodes: TreeNode[]): Promise<void>
  saveRequest(workspaceId: string, request: AnyRequest): Promise<void>
  deleteRequest(workspaceId: string, requestId: string): Promise<void>
  saveEnvironment(workspaceId: string, environment: Environment): Promise<void>
  deleteEnvironment(workspaceId: string, environmentId: string): Promise<void>
  saveSettings(workspaceId: string, settings: WorkspaceSettings): Promise<void>
}

export interface SuiteStorageApi {
  listSuites(workspaceId: string): Promise<TestSuite[]>
  saveSuite(workspaceId: string, suite: TestSuite): Promise<void>
  deleteSuite(workspaceId: string, suiteId: string): Promise<void>
  listRuns(workspaceId: string, suiteId: string): Promise<SuiteRun[]>
  saveRun(workspaceId: string, run: SuiteRun): Promise<void>
}

export interface WireMateApi extends WorkspaceStorageApi, SuiteStorageApi {
  readonly platform: string
  selectFolder(): Promise<string | null>
  /** `transferId` names the request so `cancelHttp` can abort it. */
  sendHttp(request: WireRequest, transferId?: string): Promise<HttpResult>
  cancelHttp(transferId: string): Promise<void>
  runScript(run: ScriptRun): Promise<ScriptOutcome>
  /** Asks where to save a report, suggesting a file name; resolves to the path, or null when cancelled. */
  chooseReportFile(suggestedName: string): Promise<string | null>
  /** Creates the PDF of a finished run at a path the user just chose with `chooseReportFile`. */
  savePdfReport(run: SuiteRun, path: string): Promise<void>
  /** Opens a report this app saved; any other path is ignored. */
  openReport(path: string): Promise<void>
  /** Registers the work to finish (pending saves) before the window closes. */
  onBeforeClose(finish: () => Promise<void>): void
}
