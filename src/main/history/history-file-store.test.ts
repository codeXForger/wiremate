// @vitest-environment node
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT } from '@shared/history/history-schema'
import type { HistoryEntry } from '@shared/types/history'
import { HistoryFileStore } from './history-file-store'

function entry(id: string, at: number): HistoryEntry {
  return {
    id,
    category: 'api',
    at,
    requestId: 'req_1',
    requestName: 'List users',
    method: 'GET',
    url: 'https://api.test/users',
    environmentName: 'Local',
    status: 200,
    statusText: 'OK',
    durationMs: 42,
    sizeBytes: 120,
    testsPassed: 1,
    testsFailed: 0
  }
}

const root = () => mkdtempSync(join(tmpdir(), 'wiremate-history-'))

describe('HistoryFileStore', () => {
  it('keeps entries newest first, per section, and clears them', async () => {
    const path = root()
    const store = new HistoryFileStore()
    expect(await store.list(path, 'api')).toEqual([])
    await store.add(path, entry('h_1', 1))
    await store.add(path, entry('h_2', 2))
    expect((await store.list(path, 'api')).map((e) => e.id)).toEqual(['h_2', 'h_1'])
    expect(await store.list(path, 'graphql')).toEqual([])
    await store.clear(path, 'api')
    expect(existsSync(join(path, 'history', 'api.json'))).toBe(false)
    expect(await store.list(path, 'api')).toEqual([])
  })

  it('does not lose entries saved at the same time, and keeps only the newest', async () => {
    const path = root()
    const store = new HistoryFileStore()
    await Promise.all(Array.from({ length: HISTORY_LIMIT + 3 }, (_, i) => store.add(path, entry(`h_${i}`, i))))
    const entries = await store.list(path, 'api')
    expect(entries).toHaveLength(HISTORY_LIMIT)
    expect(entries[0]?.id).toBe(`h_${HISTORY_LIMIT + 2}`)
  })

  it('refuses unknown sections and malformed entries', async () => {
    const store = new HistoryFileStore()
    await expect(store.list(root(), '../etc')).rejects.toThrow('Unknown section ../etc')
    await expect(store.clear(root(), 'nope')).rejects.toThrow('Unknown section')
    await expect(store.add(root(), { ...entry('../x', 1) })).rejects.toThrow()
  })
})
