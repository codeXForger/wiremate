import { create } from 'zustand'
import type { ResponseState } from '@shared/types/response'

interface ResponseStoreState {
  responses: Record<string, ResponseState>
  setResponse: (requestId: string, response: ResponseState) => void
  clear: (requestId: string) => void
}

export const useResponseStore = create<ResponseStoreState>()((set, get) => ({
  responses: {},
  setResponse: (requestId, response) => set({ responses: { ...get().responses, [requestId]: response } }),
  clear: (requestId) => {
    const { [requestId]: _removed, ...rest } = get().responses
    set({ responses: rest })
  }
}))
