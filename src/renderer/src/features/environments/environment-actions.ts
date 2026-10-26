import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function isEnvironmentId(id: string): boolean {
  return id.startsWith('env_')
}

export function createAndOpenEnvironment(): void {
  useTabStore.getState().open(useWorkspaceStore.getState().addEnvironment())
}

export function renameEnvironment(id: string, name: string): void {
  useWorkspaceStore.getState().updateEnvironment(id, { name })
}
