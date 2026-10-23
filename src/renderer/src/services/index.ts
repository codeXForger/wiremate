import { BridgeHttpTransport, BridgeScriptExecutor } from './bridge-clients'
import { NativeFolderPicker, type FolderPicker } from './folder-picker'
import { MockWorkspaceRepository } from './mock-workspace-repository'
import { RequestPipeline } from './request-pipeline'
import { BridgeSuiteRepository, MemorySuiteRepository, type SuiteRepository } from './suite-repository'
import { SuiteRunner } from './suite-runner'
import type { WorkspaceRepository } from './workspace-repository'

export interface Services {
  workspaces: WorkspaceRepository
  folderPicker: FolderPicker
  pipeline: RequestPipeline
  suites: SuiteRepository
  suiteRunner: SuiteRunner
}

const pipeline = new RequestPipeline({ transport: new BridgeHttpTransport(), scripts: new BridgeScriptExecutor() })

export const services: Services = {
  workspaces: new MockWorkspaceRepository(),
  folderPicker: new NativeFolderPicker(),
  pipeline,
  suites: window.wiremate ? new BridgeSuiteRepository() : new MemorySuiteRepository(),
  suiteRunner: new SuiteRunner({ pipeline })
}
