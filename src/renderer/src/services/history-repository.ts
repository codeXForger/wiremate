import type { HistoryStorageApi } from '@shared/ipc'
import { HISTORY_LIMIT } from '@shared/history/history-schema'
import type { CategoryId } from '@shared/protocols/categories'
import type { HistoryEntry } from '@shared/types/history'

/** Storage boundary for request history. In the app it is the preload bridge, which writes the workspace folder. */
export type HistoryRepository = HistoryStorageApi

/** Keeps history in memory, for tests and for running the renderer in a plain browser. */
export class MemoryHistoryRepository implements HistoryRepository {
  private readonly entries = new Map<string, HistoryEntry[]>()

  public listHistory(workspaceId: string, category: CategoryId): Promise<HistoryEntry[]> {
    return Promise.resolve([...(this.entries.get(`${workspaceId}/${category}`) ?? [])])
  }

  public addHistory(workspaceId: string, entry: HistoryEntry): Promise<void> {
    const key = `${workspaceId}/${entry.category}`
    this.entries.set(key, [entry, ...(this.entries.get(key) ?? [])].slice(0, HISTORY_LIMIT))
    return Promise.resolve()
  }

  public clearHistory(workspaceId: string, category: CategoryId): Promise<void> {
    this.entries.delete(`${workspaceId}/${category}`)
    return Promise.resolve()
  }
}
