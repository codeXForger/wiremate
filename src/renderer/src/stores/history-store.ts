import { create } from 'zustand'
import { HISTORY_LIMIT } from '@shared/history/history-schema'
import type { CategoryId } from '@shared/protocols/categories'
import type { HistoryEntry } from '@shared/types/history'
import { services } from '@/services'
import { useWorkspaceStore } from './workspace-store'

interface HistoryState {
  /** Each section's sent requests, newest first. */
  entries: Partial<Record<CategoryId, HistoryEntry[]>>
  load: (category: CategoryId) => Promise<void>
  record: (entry: HistoryEntry) => void
  clear: (category: CategoryId) => void
}

const workspaceId = (): string | null => useWorkspaceStore.getState().activeWorkspaceId

type Set = (patch: Partial<HistoryState>) => void
type Get = () => HistoryState

function withEntries(get: Get, category: CategoryId, entries: HistoryEntry[]): Partial<HistoryState> {
  return { entries: { ...get().entries, [category]: entries } }
}

async function load(set: Set, get: Get, category: CategoryId): Promise<void> {
  const id = workspaceId()
  set(withEntries(get, category, id === null ? [] : await services.history.listHistory(id, category)))
}

function record(set: Set, get: Get, entry: HistoryEntry): void {
  set(withEntries(get, entry.category, [entry, ...(get().entries[entry.category] ?? [])].slice(0, HISTORY_LIMIT)))
  const id = workspaceId()
  if (id !== null) void services.history.addHistory(id, entry)
}

function clear(set: Set, get: Get, category: CategoryId): void {
  set(withEntries(get, category, []))
  const id = workspaceId()
  if (id !== null) void services.history.clearHistory(id, category)
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  entries: {},
  load: (category) => load(set, get, category),
  record: (entry) => record(set, get, entry),
  clear: (category) => clear(set, get, category)
}))
