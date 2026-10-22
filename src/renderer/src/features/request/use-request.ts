import { useCallback } from 'react'
import type { AnyRequest, ProtocolConfigMap, ProtocolId } from '@shared/types/protocol'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

type ConfigUpdater<P extends ProtocolId> = (patch: Partial<ProtocolConfigMap[P]>) => void

export function useRequest(id: string): AnyRequest | undefined {
  return useWorkspaceStore((state) => state.requests[id])
}

export function useRequestConfig<P extends ProtocolId>(id: string): [ProtocolConfigMap[P], ConfigUpdater<P>] {
  const config = useWorkspaceStore((state) => state.requests[id]?.config) as ProtocolConfigMap[P]
  const update = useCallback<ConfigUpdater<P>>(
    (patch) => {
      useWorkspaceStore.getState().updateConfig<P>(id, patch)
      useTabStore.getState().markDirty(id)
    },
    [id]
  )
  return [config, update]
}
