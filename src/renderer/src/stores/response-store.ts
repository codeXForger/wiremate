import { create } from 'zustand'
import type { ResponseState, StreamSession } from '@shared/types/response'

interface ResponseStoreState {
  responses: Record<string, ResponseState>
  /** Requests that are on their way. */
  pendingIds: string[]
  setResponse: (requestId: string, response: ResponseState) => void
  setPending: (requestId: string) => void
  clear: (requestId: string) => void
}

export const useResponseStore = create<ResponseStoreState>()((set, get) => ({
  responses: {},
  pendingIds: [],
  setResponse: (requestId, response) =>
    set({
      responses: { ...get().responses, [requestId]: response },
      pendingIds: get().pendingIds.filter((id) => id !== requestId)
    }),
  setPending: (requestId) => set({ pendingIds: [...get().pendingIds, requestId] }),
  clear: (requestId) => {
    const { [requestId]: _removed, ...rest } = get().responses
    set({ responses: rest })
  }
}))

function streamSessionOf(requestId: string): StreamSession | undefined {
  const response = useResponseStore.getState().responses[requestId]
  return response?.kind === 'stream' ? response : undefined
}

/** Live sessions (sockets, Kafka clients) show in the response store, by request id. */
export const streamSessionStore = {
  get: streamSessionOf,
  set: (requestId: string, session: StreamSession): void => useResponseStore.getState().setResponse(requestId, session)
}
