import { BridgeHttpTransport, BridgeScriptExecutor } from './bridge-clients'
import { NativeFolderPicker, type FolderPicker } from './folder-picker'
import { MemoryHistoryRepository, type HistoryRepository } from './history-repository'
import { RequestPipeline } from './request-pipeline'
import { MemorySuiteRepository, type SuiteRepository } from './suite-repository'
import { SuiteRunner } from './suite-runner'
import { MemoryWorkspaceRepository, type WorkspaceRepository } from './workspace-repository'

export interface Services {
  workspaces: WorkspaceRepository
  folderPicker: FolderPicker
  pipeline: RequestPipeline
  suites: SuiteRepository
  history: HistoryRepository
  suiteRunner: SuiteRunner
}

const pipeline = new RequestPipeline({ transport: new BridgeHttpTransport(), scripts: new BridgeScriptExecutor() })

/** The preload bridge stores workspaces and suites on disk; without it (tests, a plain browser) they live in memory. */
export const services: Services = {
  workspaces: window.wiremate ?? new MemoryWorkspaceRepository(),
  folderPicker: new NativeFolderPicker(),
  pipeline,
  suites: window.wiremate ?? new MemorySuiteRepository(),
  history: window.wiremate ?? new MemoryHistoryRepository(),
  suiteRunner: new SuiteRunner({ pipeline })
}
