import type { StateCreator } from 'zustand'
import type { TreeSlice, WorkspaceState } from './workspace-types'
import { discardDraft, insertDraft, saveDraft } from './draft-operations'
import {
  duplicateInTree,
  insertFolder,
  insertRequest,
  moveInTree,
  patchConfig,
  placeInTree,
  removeFromTree,
  renameInTree,
  type Insertion
} from './tree-operations'

type Creator = StateCreator<WorkspaceState, [], [], TreeSlice>

type SetState = Parameters<Creator>[0]

function committer(set: SetState): (insertion: Pick<Insertion, 'id'> & { patch: Partial<WorkspaceState> }) => string {
  return ({ id, patch }) => {
    set(patch)
    return id
  }
}

function commitIfAny(commit: (insertion: Insertion) => string, insertion: Insertion | null): string | null {
  return insertion ? commit(insertion) : null
}

type DraftActions = Pick<TreeSlice, 'drafts' | 'addDraft' | 'saveDraft' | 'discardDraft' | 'addRequest'>

/** Adding a request: at once, or as a draft first (see `drafts`). */
function draftActions(set: SetState, get: () => WorkspaceState): DraftActions {
  const commit = committer(set)
  return {
    drafts: {},
    addRequest: (parentId, protocol) => commit(insertRequest(get(), parentId, protocol)),
    addDraft: (parentId, protocol) => commit(insertDraft(get(), parentId, protocol)),
    saveDraft: (id, name) => set(saveDraft(get(), id, name)),
    discardDraft: (id) => set(discardDraft(get(), id))
  }
}

export const createTreeSlice: Creator = (set, get) => {
  const commit = committer(set)
  return {
    nodes: [],
    requests: {},
    ...draftActions(set, get),
    addFolder: (parentId, category) => commit(insertFolder(get(), parentId, category)),
    duplicateRequest: (id) => commitIfAny(commit, duplicateInTree(get(), id)),
    renameNode: (id, name) => set(renameInTree(get(), id, name)),
    removeNode: (id) => set(removeFromTree(get(), id)),
    moveNode: (id, parentId) => set(moveInTree(get(), id, parentId)),
    placeNode: (id, target) => set(placeInTree(get(), id, target)),
    updateConfig: (id, patch) => set(patchConfig(get(), id, patch))
  }
}
