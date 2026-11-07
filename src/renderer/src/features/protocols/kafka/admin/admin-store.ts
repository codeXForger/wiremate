import { create } from 'zustand'
import type {
  KafkaClusterInfo,
  KafkaGroupDetails,
  KafkaGroupSummary,
  KafkaTopicDetails,
  KafkaTopicSummary
} from '@shared/types/kafka'

/** What the admin view of one Kafka request has loaded, and which topic or group is open. */
export interface AdminView {
  cluster?: KafkaClusterInfo
  topics?: KafkaTopicSummary[]
  groups?: KafkaGroupSummary[]
  topic?: KafkaTopicDetails
  group?: KafkaGroupDetails
  /** Admin calls still on their way. */
  pending: number
}

const EMPTY: AdminView = { pending: 0 }

interface AdminStoreState {
  views: Record<string, AdminView>
  patch: (requestId: string, change: Partial<AdminView>) => void
  /** Counts a call in (+1) or out (-1). */
  track: (requestId: string, step: 1 | -1) => void
}

export const useAdminStore = create<AdminStoreState>()((set, get) => ({
  views: {},
  patch: (requestId, change) => set({ views: { ...get().views, [requestId]: { ...adminView(requestId), ...change } } }),
  track: (requestId, step) => get().patch(requestId, { pending: adminView(requestId).pending + step })
}))

export function adminView(requestId: string): AdminView {
  return useAdminStore.getState().views[requestId] ?? EMPTY
}

export function useAdminView(requestId: string): AdminView {
  return useAdminStore((state) => state.views[requestId] ?? EMPTY)
}
