import { NativeFolderPicker, type FolderPicker } from './folder-picker'
import { MockWorkspaceRepository } from './mock-workspace-repository'
import type { WorkspaceRepository } from './workspace-repository'

export interface Services {
  workspaces: WorkspaceRepository
  folderPicker: FolderPicker
}

export const services: Services = {
  workspaces: new MockWorkspaceRepository(),
  folderPicker: new NativeFolderPicker()
}
