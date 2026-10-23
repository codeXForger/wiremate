// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SuiteRun, TestSuite } from '@shared/types/suite'
import { RUN_HISTORY_LIMIT, SuiteFileStore } from './suite-file-store'

const suite = (id: string, name: string): TestSuite => ({
  id,
  name,
  items: [{ id: 'i1', nodeId: 'req_1' }],
  options: { stopOnFailure: true, delayMs: 0 }
})

const run = (id: string, startedAt: number): SuiteRun => ({
  id,
  suiteId: 'suite_a',
  suiteName: 'A',
  startedAt,
  environmentName: null,
  results: [],
  summary: { requests: 0, passed: 0, failed: 0, skipped: 0, tests: 0, testsPassed: 0, testsFailed: 0, durationMs: 1 }
})

function workspace(): string {
  return mkdtempSync(join(tmpdir(), 'wiremate-ws-'))
}

describe('SuiteFileStore', () => {
  it('saves, lists and deletes suites with their runs', async () => {
    const path = workspace()
    const store = new SuiteFileStore()
    await store.saveSuite(path, suite('suite_b', 'Beta'))
    await store.saveSuite(path, suite('suite_a', 'Alpha'))
    expect((await store.listSuites(path)).map((s) => s.name)).toEqual(['Alpha', 'Beta'])
    expect(readFileSync(join(path, '.wiremate', 'suites', 'suite_a.json'), 'utf8')).toContain('"name": "Alpha"')

    await store.saveRun(path, run('run_1', 1))
    await store.saveRun(path, run('run_2', 2))
    expect((await store.listRuns(path, 'suite_a')).map((r) => r.id)).toEqual(['run_2', 'run_1'])

    await store.deleteSuite(path, 'suite_a')
    expect((await store.listSuites(path)).map((s) => s.id)).toEqual(['suite_b'])
    expect(existsSync(join(path, '.wiremate', 'runs', 'suite_a'))).toBe(false)
  })

  it('returns nothing for a workspace without data and skips broken files', async () => {
    const path = workspace()
    const store = new SuiteFileStore()
    expect(await store.listSuites(path)).toEqual([])
    mkdirSync(join(path, '.wiremate', 'suites'), { recursive: true })
    writeFileSync(join(path, '.wiremate', 'suites', 'bad.json'), '{ nope')
    writeFileSync(join(path, '.wiremate', 'suites', 'notes.txt'), 'x')
    expect(await store.listSuites(path)).toEqual([])
  })

  it('keeps only the newest runs', async () => {
    const path = workspace()
    const store = new SuiteFileStore()
    await Promise.all(Array.from({ length: RUN_HISTORY_LIMIT + 2 }, (_, i) => store.saveRun(path, run(`run_${i}`, i))))
    const runs = await store.listRuns(path, 'suite_a')
    expect(runs).toHaveLength(RUN_HISTORY_LIMIT)
    expect(runs[0]?.id).toBe(`run_${RUN_HISTORY_LIMIT + 1}`)
  })

  it('expands ~ to the home folder', async () => {
    const home = workspace()
    await new SuiteFileStore(home).saveSuite('~/demo', suite('suite_a', 'A'))
    expect(existsSync(join(home, 'demo', '.wiremate', 'suites', 'suite_a.json'))).toBe(true)
  })

  it('rejects ids that could escape the folder', async () => {
    const store = new SuiteFileStore()
    await expect(store.saveSuite(workspace(), suite('../evil', 'x'))).rejects.toThrow(/Invalid id/)
    await expect(store.listRuns(workspace(), '../../etc')).rejects.toThrow(/Invalid id/)
    await expect(store.deleteSuite(workspace(), 'a/b')).rejects.toThrow(/Invalid id/)
  })
})
