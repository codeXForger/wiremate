import { BridgeHttpTransport, BridgeScriptExecutor } from './bridge-clients'
import { NativeFolderPicker, type FolderPicker } from './folder-picker'
import { MockWorkspaceRepository } from './mock-workspace-repository'
import { RequestPipeline } from './request-pipeline'
import type { WorkspaceRepository } from './workspace-repository'

export interface Services {
  workspaces: WorkspaceRepository
  folderPicker: FolderPicker
  pipeline: RequestPipeline
}

export const services: Services = {
  workspaces: new MockWorkspaceRepository(),
  folderPicker: new NativeFolderPicker(),
  pipeline: new RequestPipeline({ transport: new BridgeHttpTransport(), scripts: new BridgeScriptExecutor() })
}
