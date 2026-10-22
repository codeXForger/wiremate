import type { StateCreator } from 'zustand'
import type { WorkspaceContent } from '@shared/types/workspace'
import type { WorkspaceRepository } from '@/services/workspace-repository'
import type { WorkspaceSlice, WorkspaceState } from './workspace-types'

type Creator = StateCreator<WorkspaceState, [], [], WorkspaceSlice>

export function contentState(workspaceId: string, content: WorkspaceContent): Partial<WorkspaceState> {
  const activeEnvironmentId = content.environments[0]?.id ?? null
  return { activeWorkspaceId: workspaceId, ...content, activeEnvironmentId }
}

export const createWorkspaceSlice =
  (repository: WorkspaceRepository): Creator =>
  (set, get) => ({
    workspaces: [],
    activeWorkspaceId: null,
    loadWorkspaces: async () => set({ workspaces: await repository.listWorkspaces() }),
    openWorkspace: async (id) => set(contentState(id, await repository.loadContent(id))),
    createWorkspace: async (input) => {
      const workspace = await repository.createWorkspace(input)
      set({ workspaces: [...get().workspaces, workspace] })
      await get().openWorkspace(workspace.id)
    }
  })
