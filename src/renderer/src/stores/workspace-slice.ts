import type { StateCreator } from 'zustand'
import type { CreateWorkspaceInput, Workspace, WorkspaceContent } from '@shared/types/workspace'
import type { WorkspaceRepository } from '@/services/workspace-repository'
import type { WorkspaceSlice, WorkspaceState } from './workspace-types'

type Creator = StateCreator<WorkspaceState, [], [], WorkspaceSlice>

export function contentState(workspaceId: string, content: WorkspaceContent): Partial<WorkspaceState> {
  const { settings, ...rest } = content
  const known = content.environments.some((env) => env.id === settings.activeEnvironmentId)
  return {
    activeWorkspaceId: workspaceId,
    ...rest,
    activeEnvironmentId: known ? settings.activeEnvironmentId : null,
    theme: settings.theme
  }
}

function mostRecent(workspaces: Workspace[]): Workspace | undefined {
  return [...workspaces].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)[0]
}

type Get = () => WorkspaceState

async function openLastWorkspace(get: Get): Promise<void> {
  await get().loadWorkspaces()
  const last = mostRecent(get().workspaces)
  if (last) await get().openWorkspace(last.id)
}

async function createAndOpen(repository: WorkspaceRepository, get: Get, input: CreateWorkspaceInput): Promise<void> {
  const workspace = await repository.createWorkspace(input)
  await get().loadWorkspaces()
  await get().openWorkspace(workspace.id)
}

/** `repository` is looked up on every call, so tests can swap the storage behind the store. */
export const createWorkspaceSlice =
  (repository: () => WorkspaceRepository): Creator =>
  (set, get) => ({
    workspaces: [],
    activeWorkspaceId: null,
    loadCount: 0,
    theme: 'dark',
    setTheme: (theme) => set({ theme }),
    loadWorkspaces: async () => set({ workspaces: await repository().listWorkspaces() }),
    openLastWorkspace: () => openLastWorkspace(get),
    openWorkspace: async (id) => {
      const content = await repository().openWorkspace(id)
      set({ ...contentState(id, content), loadCount: get().loadCount + 1 })
    },
    createWorkspace: (input) => createAndOpen(repository(), get, input)
  })
