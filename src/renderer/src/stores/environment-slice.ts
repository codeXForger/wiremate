import type { StateCreator } from 'zustand'
import type { Environment } from '@shared/types/workspace'
import { createId } from '@shared/utils/id'
import type { EnvironmentSlice, WorkspaceState } from './workspace-types'

type Creator = StateCreator<WorkspaceState, [], [], EnvironmentSlice>
type EnvironmentState = Pick<WorkspaceState, 'environments' | 'activeEnvironmentId'>

/** "Environment 3", or the next number that is not taken. */
function nextName(environments: Environment[]): string {
  const names = new Set(environments.map((env) => env.name))
  let n = environments.length + 1
  while (names.has(`Environment ${n}`)) n += 1
  return `Environment ${n}`
}

/** A new environment becomes the active one only when none is active yet. */
export function insertEnvironment(state: EnvironmentState, name?: string): { id: string; patch: EnvironmentState } {
  const environment = { id: createId('env'), name: name ?? nextName(state.environments), variables: [] }
  const activeEnvironmentId = state.activeEnvironmentId ?? environment.id
  return { id: environment.id, patch: { environments: [...state.environments, environment], activeEnvironmentId } }
}

/** Removing the active environment leaves no environment active. */
export function deleteEnvironment(state: EnvironmentState, id: string): EnvironmentState {
  const activeEnvironmentId = state.activeEnvironmentId === id ? null : state.activeEnvironmentId
  return { environments: state.environments.filter((env) => env.id !== id), activeEnvironmentId }
}

export const createEnvironmentSlice: Creator = (set, get) => ({
  environments: [],
  activeEnvironmentId: null,
  setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),
  updateEnvironment: (id, patch) => {
    const environments = get().environments.map((env) => (env.id === id ? { ...env, ...patch } : env))
    set({ environments })
  },
  addEnvironment: (name) => {
    const { id, patch } = insertEnvironment(get(), name)
    set(patch)
    return id
  },
  removeEnvironment: (id) => set(deleteEnvironment(get(), id))
})
