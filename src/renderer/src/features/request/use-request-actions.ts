import { useMemo } from 'react'
import type { StreamSession } from '@shared/types/response'
import { SimulatedRunner } from '@/services/simulated-runner'
import { useResponseStore } from '@/stores/response-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { sendHttpRequest } from './send-http'

const runner = new SimulatedRunner()

function currentSession(id: string): StreamSession {
  const response = useResponseStore.getState().responses[id]
  return response?.kind === 'stream' ? response : { kind: 'stream', connected: false, events: [] }
}

export interface RequestActions {
  send: () => Promise<void>
  connect: (target: string) => void
  disconnect: () => void
  publish: (payload: string) => void
}

export function useRequestActions(id: string): RequestActions {
  return useMemo(() => createActions(id), [id])
}

function createActions(id: string): RequestActions {
  const store = (): ReturnType<typeof useResponseStore.getState> => useResponseStore.getState()
  return {
    send: async () => {
      const request = useWorkspaceStore.getState().requests[id]
      if (request?.protocol === 'http') await sendHttpRequest(request)
      else if (request) store().setResponse(id, runner.exchange(request))
    },
    connect: (target) => store().setResponse(id, runner.connect(target)),
    disconnect: () => store().setResponse(id, runner.disconnect(currentSession(id))),
    publish: (payload) => store().setResponse(id, runner.send(currentSession(id), payload))
  }
}

export function useStreamSession(id: string): StreamSession | undefined {
  return useResponseStore((state) => {
    const response = state.responses[id]
    return response?.kind === 'stream' ? response : undefined
  })
}
