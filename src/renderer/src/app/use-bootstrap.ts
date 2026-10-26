import { useEffect } from 'react'
import { connectStores } from '@/stores/connect-stores'
import { connectPersistence, saveQueue } from '@/stores/workspace-persistence'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function useBootstrap(): void {
  useEffect(() => {
    const disconnect = connectStores()
    const stopSaving = connectPersistence()
    window.wiremate?.onBeforeClose(() => saveQueue.flush())
    void useWorkspaceStore.getState().openLastWorkspace()
    return () => {
      disconnect()
      stopSaving()
    }
  }, [])
}
