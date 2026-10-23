import type { StateCreator } from 'zustand'
import type { TreeSlice, WorkspaceState } from './workspace-types'
import {
  duplicateInTree,
  insertFolder,
  insertRequest,
  moveInTree,
  patchConfig,
  removeFromTree,
  renameInTree,
  type Insertion
} from './tree-operations'

type Creator = StateCreator<WorkspaceState, [], [], TreeSlice>

type SetState = Parameters<Creator>[0]

function committer(set: SetState): (insertion: Insertion) => string {
  return ({ id, patch }) => {
    set(patch)
    return id
  }
}

function commitIfAny(commit: (insertion: Insertion) => string, insertion: Insertion | null): string | null {
  return insertion ? commit(insertion) : null
}

export const createTreeSlice: Creator = (set, get) => {
  const commit = committer(set)
  return {
    nodes: [],
    requests: {},
    addFolder: (parentId, category) => commit(insertFolder(get(), parentId, category)),
    addRequest: (parentId, protocol) => commit(insertRequest(get(), parentId, protocol)),
    duplicateRequest: (id) => commitIfAny(commit, duplicateInTree(get(), id)),
    renameNode: (id, name) => set(renameInTree(get(), id, name)),
    removeNode: (id) => set(removeFromTree(get(), id)),
    moveNode: (id, parentId) => set(moveInTree(get(), id, parentId)),
    updateConfig: (id, patch) => set(patchConfig(get(), id, patch))
  }
}
