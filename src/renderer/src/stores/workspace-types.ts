import type { CategoryId } from '@shared/protocols/categories'
import type { AnyRequest, ProtocolConfigMap, ProtocolId } from '@shared/types/protocol'
import type { Environment, TreeNode, Workspace } from '@shared/types/workspace'
import type { CreateWorkspaceInput } from '@/services/workspace-repository'

export interface WorkspaceSlice {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  loadWorkspaces: () => Promise<void>
  openWorkspace: (id: string) => Promise<void>
  createWorkspace: (input: CreateWorkspaceInput) => Promise<void>
}

export interface TreeSlice {
  nodes: TreeNode[]
  requests: Record<string, AnyRequest>
  addFolder: (parentId: string | null, category: CategoryId) => string
  addRequest: (parentId: string | null, protocol: ProtocolId) => string
  /** Copies a request into the same folder and returns the copy's id, or null if `id` is not a request. */
  duplicateRequest: (id: string) => string | null
  renameNode: (id: string, name: string) => void
  removeNode: (id: string) => void
  moveNode: (id: string, parentId: string | null) => void
  updateConfig: <P extends ProtocolId>(id: string, patch: Partial<ProtocolConfigMap[P]>) => void
}

export interface EnvironmentSlice {
  environments: Environment[]
  activeEnvironmentId: string | null
  setActiveEnvironment: (id: string | null) => void
  updateEnvironment: (id: string, patch: Partial<Environment>) => void
  addEnvironment: (name: string) => void
}

export type WorkspaceState = WorkspaceSlice & TreeSlice & EnvironmentSlice
