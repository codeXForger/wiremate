import { create } from 'zustand'
import type { ResponseState } from '@shared/types/response'

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
