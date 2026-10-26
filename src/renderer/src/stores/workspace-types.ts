import type { CategoryId } from '@shared/protocols/categories'
import type { PlacePosition } from '@/features/explorer/tree-utils'
import type { AnyRequest, ProtocolConfigMap, ProtocolId } from '@shared/types/protocol'
import type { CreateWorkspaceInput, Environment, Theme, TreeNode, Workspace } from '@shared/types/workspace'

export interface WorkspaceSlice {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  /** Goes up every time a workspace is loaded, so observers can tell a load from an edit. */
  loadCount: number
  /** A setting of the open workspace, saved in its wiremate.json. */
  theme: Theme
  setTheme: (theme: Theme) => void
  loadWorkspaces: () => Promise<void>
  /** Opens the most recently used workspace (the main process creates a default one on first launch). */
  openLastWorkspace: () => Promise<void>
  openWorkspace: (id: string) => Promise<void>
  createWorkspace: (input: CreateWorkspaceInput) => Promise<void>
}

export interface TreeSlice {
  nodes: TreeNode[]
  requests: Record<string, AnyRequest>
  /** Requests not saved yet (sections that save explicitly), by id, to the folder they will be saved in. */
  drafts: Record<string, string | null>
  /** Opens a draft (see `drafts`); returns its id. */
  addDraft: (parentId: string | null, protocol: ProtocolId) => string
  /** Adds a draft to the tree under `name` (its current name when empty), which saves it. */
  saveDraft: (id: string, name: string) => void
  discardDraft: (id: string) => void
  addFolder: (parentId: string | null, category: CategoryId) => string
  addRequest: (parentId: string | null, protocol: ProtocolId) => string
  /** Copies a request into the same folder and returns the copy's id, or null if `id` is not a request. */
  duplicateRequest: (id: string) => string | null
  renameNode: (id: string, name: string) => void
  removeNode: (id: string) => void
  /** Moves a node into a folder (null: the section root) as its last child. */
  moveNode: (id: string, parentId: string | null) => void
  /** Moves a node right before or after another node, into that node's folder. */
  placeNode: (id: string, target: { id: string; position: PlacePosition }) => void
  updateConfig: <P extends ProtocolId>(id: string, patch: Partial<ProtocolConfigMap[P]>) => void
}

export interface EnvironmentSlice {
  environments: Environment[]
  activeEnvironmentId: string | null
  setActiveEnvironment: (id: string | null) => void
  updateEnvironment: (id: string, patch: Partial<Environment>) => void
  /** Returns the new environment's id. Without a name it is called "Environment <n>". */
  addEnvironment: (name?: string) => string
  /** Deletes an environment; when it was the active one, no environment is active afterwards. */
  removeEnvironment: (id: string) => void
}

export type WorkspaceState = WorkspaceSlice & TreeSlice & EnvironmentSlice
