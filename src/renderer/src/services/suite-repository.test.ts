import { describe, expect, it } from 'vitest'
import { createSuite } from '@shared/suites/suite-factory'
import type { SuiteRun } from '@shared/types/suite'
import { MemorySuiteRepository } from './suite-repository'

const run = (id: string, suiteId: string, startedAt: number): SuiteRun => ({
  id,
  suiteId,
  suiteName: 'S',
  startedAt,
  environmentName: null,
  results: [],
  summary: { requests: 0, passed: 0, failed: 0, skipped: 0, tests: 0, testsPassed: 0, testsFailed: 0, durationMs: 0 }
})

describe('MemorySuiteRepository', () => {
  it('keeps suites and runs per workspace', async () => {
    const repo = new MemorySuiteRepository()
    const suite = createSuite('A')
    await repo.saveSuite('/one', suite)
    await repo.saveRun('/one', run('r1', suite.id, 1))
    await repo.saveRun('/one', run('r2', suite.id, 2))
    await repo.saveRun('/one', run('r3', 'other', 3))
    expect(await repo.listSuites('/one')).toEqual([suite])
    expect(await repo.listSuites('/two')).toEqual([])
    expect((await repo.listRuns('/one', suite.id)).map((r) => r.id)).toEqual(['r2', 'r1'])
    await repo.deleteSuite('/one', suite.id)
    expect(await repo.listSuites('/one')).toEqual([])
  })
})
