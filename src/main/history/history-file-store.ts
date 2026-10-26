import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { HISTORY_LIMIT, HistoryEntrySchema, HistoryFileSchema } from '@shared/history/history-schema'
import { CATEGORY_IDS, type CategoryId } from '@shared/protocols/categories'
import type { HistoryEntry } from '@shared/types/history'
import { WORKSPACE_FILES } from '@shared/workspace/workspace-files'
import { readJson, writeJson } from '../storage/json-files'

function categoryOf(value: string): CategoryId {
  const category = CATEGORY_IDS.find((id) => id === value)
  if (!category) throw new Error(`Unknown section ${value}`)
  return category
}

/**
 * Keeps each section's request history in `history/<section>.json`, newest first and at most HISTORY_LIMIT long.
 * Writes to one file are queued, so two sends close together cannot overwrite each other.
 */
export class HistoryFileStore {
  private readonly queues = new Map<string, Promise<unknown>>()

  public async list(root: string, category: string): Promise<HistoryEntry[]> {
    return (await readJson(this.file(root, categoryOf(category)), HistoryFileSchema))?.entries ?? []
  }

  public async add(root: string, entry: HistoryEntry): Promise<void> {
    const valid = HistoryEntrySchema.parse(entry)
    await this.queued(this.file(root, valid.category), async (file) => {
      const entries = [valid, ...(await this.list(root, valid.category))].slice(0, HISTORY_LIMIT)
      await writeJson(file, { entries })
    })
  }

  public async clear(root: string, category: string): Promise<void> {
    await this.queued(this.file(root, categoryOf(category)), (file) => rm(file, { force: true }))
  }

  private file(root: string, category: CategoryId): string {
    return join(root, WORKSPACE_FILES.history, `${category}.json`)
  }

  private queued(file: string, work: (file: string) => Promise<void>): Promise<void> {
    const next = (this.queues.get(file) ?? Promise.resolve()).then(() => work(file))
    this.queues.set(
      file,
      next.catch(() => undefined)
    )
    return next
  }
}
