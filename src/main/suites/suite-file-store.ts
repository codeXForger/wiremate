import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { z } from 'zod'
import { SafeId, SuiteRunSchema, TestSuiteSchema } from '@shared/suites/suite-schema'
import type { SuiteRun, TestSuite } from '@shared/types/suite'

const DATA_FOLDER = '.wiremate'
export const RUN_HISTORY_LIMIT = 50

/**
 * Keeps test suites and their run history as JSON files inside the workspace folder:
 * `.wiremate/suites/<suiteId>.json` and `.wiremate/runs/<suiteId>/<runId>.json`.
 */
export class SuiteFileStore {
  public constructor(private readonly home: string = homedir()) {}

  public async listSuites(workspacePath: string): Promise<TestSuite[]> {
    const suites = await SuiteFileStore.readAll(this.folder(workspacePath, 'suites'), TestSuiteSchema)
    return suites.sort((a, b) => a.name.localeCompare(b.name))
  }

  public async saveSuite(workspacePath: string, suite: TestSuite): Promise<void> {
    const valid = TestSuiteSchema.parse(suite)
    await SuiteFileStore.write(this.folder(workspacePath, 'suites'), valid.id, valid)
  }

  public async deleteSuite(workspacePath: string, suiteId: string): Promise<void> {
    const id = SafeId.parse(suiteId)
    await rm(join(this.folder(workspacePath, 'suites'), `${id}.json`), { force: true })
    await rm(this.folder(workspacePath, 'runs', id), { recursive: true, force: true })
  }

  /** Newest first, at most RUN_HISTORY_LIMIT runs. */
  public async listRuns(workspacePath: string, suiteId: string): Promise<SuiteRun[]> {
    const runs = await SuiteFileStore.readAll(this.folder(workspacePath, 'runs', SafeId.parse(suiteId)), SuiteRunSchema)
    return runs.sort((a, b) => b.startedAt - a.startedAt).slice(0, RUN_HISTORY_LIMIT)
  }

  public async saveRun(workspacePath: string, run: SuiteRun): Promise<void> {
    const valid = SuiteRunSchema.parse(run)
    await SuiteFileStore.write(this.folder(workspacePath, 'runs', valid.suiteId), valid.id, valid)
  }

  private folder(workspacePath: string, ...parts: string[]): string {
    const root = workspacePath.startsWith('~') ? join(this.home, workspacePath.slice(1)) : workspacePath
    return join(root, DATA_FOLDER, ...parts)
  }

  private static async write(folder: string, id: string, data: unknown): Promise<void> {
    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, `${id}.json`), `${JSON.stringify(data, null, 2)}\n`)
  }

  /** Reads every JSON file in a folder, skipping files that are missing, unreadable or not valid. */
  private static async readAll<T>(folder: string, schema: z.ZodType<T>): Promise<T[]> {
    const names = await readdir(folder).catch(() => [])
    const files = names.filter((name) => name.endsWith('.json'))
    const parsed: (T | undefined)[] = await Promise.all(
      files.map((name) => SuiteFileStore.read(join(folder, name), schema))
    )
    return parsed.filter((value) => value !== undefined)
  }

  private static async read<T>(path: string, schema: z.ZodType<T>): Promise<T | undefined> {
    try {
      return schema.parse(JSON.parse(await readFile(path, 'utf8')))
    } catch {
      return undefined
    }
  }
}
