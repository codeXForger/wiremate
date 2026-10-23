import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { SafeId, SuiteRunSchema, TestSuiteSchema } from '@shared/suites/suite-schema'
import type { SuiteRun, TestSuite } from '@shared/types/suite'
import { WORKSPACE_FILES } from '@shared/workspace/workspace-files'
import { readJsonFolder, writeJson } from '../storage/json-files'

export const RUN_HISTORY_LIMIT = 50

/** Keeps test suites and their run history in the workspace folder: `suites/<id>.json`, `runs/<suiteId>/<runId>.json`. */
export class SuiteFileStore {
  public async listSuites(root: string): Promise<TestSuite[]> {
    const suites = await readJsonFolder(join(root, WORKSPACE_FILES.suites), TestSuiteSchema)
    return suites.sort((a, b) => a.name.localeCompare(b.name))
  }

  public async saveSuite(root: string, suite: TestSuite): Promise<void> {
    const valid = TestSuiteSchema.parse(suite)
    await writeJson(join(root, WORKSPACE_FILES.suites, `${valid.id}.json`), valid)
  }

  public async deleteSuite(root: string, suiteId: string): Promise<void> {
    const id = SafeId.parse(suiteId)
    await rm(join(root, WORKSPACE_FILES.suites, `${id}.json`), { force: true })
    await rm(join(root, WORKSPACE_FILES.runs, id), { recursive: true, force: true })
  }

  /** Newest first, at most RUN_HISTORY_LIMIT runs. */
  public async listRuns(root: string, suiteId: string): Promise<SuiteRun[]> {
    const runs = await readJsonFolder(join(root, WORKSPACE_FILES.runs, SafeId.parse(suiteId)), SuiteRunSchema)
    return runs.sort((a, b) => b.startedAt - a.startedAt).slice(0, RUN_HISTORY_LIMIT)
  }

  public async saveRun(root: string, run: SuiteRun): Promise<void> {
    const valid = SuiteRunSchema.parse(run)
    await writeJson(join(root, WORKSPACE_FILES.runs, valid.suiteId, `${valid.id}.json`), valid)
  }
}
