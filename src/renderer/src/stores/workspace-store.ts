import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { services } from '@/services'
import type { WorkspaceRepository } from '@/services/workspace-repository'
import { createEnvironmentSlice } from './environment-slice'
import { createTreeSlice } from './tree-slice'
import { createWorkspaceSlice } from './workspace-slice'
import type { WorkspaceState } from './workspace-types'

export type WorkspaceStore = UseBoundStore<StoreApi<WorkspaceState>>

export function createWorkspaceStore(repository: WorkspaceRepository): WorkspaceStore {
  return create<WorkspaceState>()((...args) => ({
    ...createWorkspaceSlice(repository)(...args),
    ...createTreeSlice(...args),
    ...createEnvironmentSlice(...args)
  }))
}

export const useWorkspaceStore = createWorkspaceStore(services.workspaces)
