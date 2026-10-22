import type { StateCreator } from 'zustand'
import { createId } from '@shared/utils/id'
import type { EnvironmentSlice, WorkspaceState } from './workspace-types'

type Creator = StateCreator<WorkspaceState, [], [], EnvironmentSlice>

export const createEnvironmentSlice: Creator = (set, get) => ({
  environments: [],
  activeEnvironmentId: null,
  setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),
  updateEnvironment: (id, patch) => {
    const environments = get().environments.map((env) => (env.id === id ? { ...env, ...patch } : env))
    set({ environments })
  },
  addEnvironment: (name) => {
    const environment = { id: createId('env'), name, variables: [] }
    set({ environments: [...get().environments, environment], activeEnvironmentId: environment.id })
  }
})
