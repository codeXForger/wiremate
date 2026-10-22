import type { Workspace, WorkspaceContent } from '@shared/types/workspace'

export interface CreateWorkspaceInput {
  name: string
  path: string
}

/** Storage boundary for workspaces. Mock today; a folder-backed implementation replaces it later. */
export interface WorkspaceRepository {
  listWorkspaces(): Promise<Workspace[]>
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>
  loadContent(workspaceId: string): Promise<WorkspaceContent>
}
