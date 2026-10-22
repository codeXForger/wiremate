import type { StateCreator } from 'zustand'
import type { TreeSlice, WorkspaceState } from './workspace-types'
import {
  insertFolder,
  insertRequest,
  patchConfig,
  removeFromTree,
  renameInTree,
  type Insertion
} from './tree-operations'

type Creator = StateCreator<WorkspaceState, [], [], TreeSlice>

export const createTreeSlice: Creator = (set, get) => {
  const commit = ({ id, patch }: Insertion): string => {
    set(patch)
    return id
  }
  return {
    nodes: [],
    requests: {},
    addFolder: (parentId, category) => commit(insertFolder(get(), parentId, category)),
    addRequest: (parentId, protocol) => commit(insertRequest(get(), parentId, protocol)),
    renameNode: (id, name) => set(renameInTree(get(), id, name)),
    removeNode: (id) => set(removeFromTree(get(), id)),
    updateConfig: (id, patch) => set(patchConfig(get(), id, patch))
  }
}
