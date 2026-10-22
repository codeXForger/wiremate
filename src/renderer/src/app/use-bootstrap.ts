import { useEffect } from 'react'
import { connectStores } from '@/stores/connect-stores'
import { useWorkspaceStore } from '@/stores/workspace-store'

async function openFirstWorkspace(): Promise<void> {
  const store = useWorkspaceStore.getState()
  await store.loadWorkspaces()
  const [first] = useWorkspaceStore.getState().workspaces
  if (first) await store.openWorkspace(first.id)
}

export function useBootstrap(): void {
  useEffect(() => {
    const disconnect = connectStores()
    void openFirstWorkspace()
    return disconnect
  }, [])
}
