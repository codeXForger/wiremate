import type { AnyRequest } from '@shared/types/protocol'
import type { Environment } from '@shared/types/workspace'
import { errorMessage } from '@shared/scripting/describe'
import { createId } from '@shared/utils/id'
import { services } from '@/services'
import { useConsoleStore } from './console-store'
import { SaveQueue } from './save-queue'
import { useTabStore } from './tab-store'
import { useWorkspaceStore } from './workspace-store'
import type { WorkspaceState } from './workspace-types'

function reportSaveError(error: unknown): void {
  const entry = { id: createId('log'), at: Date.now(), source: 'system' as const, level: 'error' as const }
  useConsoleStore.getState().append([{ ...entry, message: `Could not save the workspace: ${errorMessage(error)}` }])
}

/** Pending writes of the open workspace. Cmd/Ctrl+S flushes it. */
export const saveQueue = new SaveQueue(reportSaveError)

interface Changes<T> {
  changed: T[]
  removed: string[]
}

/** What differs between two id → item maps, by identity: the stores replace an item whenever it changes. */
export function diffById<T>(previous: Record<string, T>, next: Record<string, T>): Changes<T> {
  const changed = Object.entries(next).filter(([id, item]) => previous[id] !== item)
  const removed = Object.keys(previous).filter((id) => !(id in next))
  return { changed: changed.map(([, item]) => item), removed }
}

const byId = (environments: Environment[]): Record<string, Environment> =>
  Object.fromEntries(environments.map((env) => [env.id, env]))

type Change = { workspaceId: string; state: WorkspaceState; previous: WorkspaceState }

/** Drafts are not saved: they reach the folder when they join the tree. */
function saveRequests({ workspaceId, state, previous }: Change): void {
  const diff = diffById<AnyRequest>(previous.requests, state.requests)
  const changed = diff.changed.filter((request) => !(request.id in state.drafts))
  const removed = diff.removed.filter((id) => !(id in previous.drafts))
  changed.forEach((request) => {
    const key = `${workspaceId}:request:${request.id}`
    saveQueue.schedule(key, async () => {
      await services.workspaces.saveRequest(workspaceId, request)
      if (!saveQueue.isPending(key)) useTabStore.getState().markClean(request.id)
    })
  })
  removed.forEach((id) => {
    saveQueue.schedule(`${workspaceId}:request:${id}`, () => services.workspaces.deleteRequest(workspaceId, id))
  })
}

function saveEnvironments({ workspaceId, state, previous }: Change): void {
  const { changed, removed } = diffById(byId(previous.environments), byId(state.environments))
  changed.forEach((env) => {
    saveQueue.schedule(`${workspaceId}:env:${env.id}`, () => services.workspaces.saveEnvironment(workspaceId, env))
  })
  removed.forEach((id) => {
    saveQueue.schedule(`${workspaceId}:env:${id}`, () => services.workspaces.deleteEnvironment(workspaceId, id))
  })
}

function saveTreeAndSettings({ workspaceId, state, previous }: Change): void {
  if (state.nodes !== previous.nodes) {
    saveQueue.schedule(`${workspaceId}:tree`, () => services.workspaces.saveTree(workspaceId, state.nodes))
  }
  if (state.theme === previous.theme && state.activeEnvironmentId === previous.activeEnvironmentId) return
  const settings = { theme: state.theme, activeEnvironmentId: state.activeEnvironmentId }
  saveQueue.schedule(`${workspaceId}:settings`, () => services.workspaces.saveSettings(workspaceId, settings))
}

/** Observer: writes every change to the open workspace (tree, requests, environments, settings) to its folder. */
export function connectPersistence(): () => void {
  return useWorkspaceStore.subscribe((state, previous) => {
    const workspaceId = state.activeWorkspaceId
    // Opening a workspace replaces everything; that is a load, not an edit.
    if (workspaceId === null || state.loadCount !== previous.loadCount) return
    const change = { workspaceId, state, previous }
    saveTreeAndSettings(change)
    saveRequests(change)
    saveEnvironments(change)
  })
}
