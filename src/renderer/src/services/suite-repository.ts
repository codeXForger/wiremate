import type { SuiteStorageApi } from '@shared/ipc'
import type { SuiteRun, TestSuite } from '@shared/types/suite'

/** Storage boundary for test suites and their run history. In the app it is the preload bridge. */
export type SuiteRepository = SuiteStorageApi

/** Keeps suites in memory, for tests and for running the renderer in a plain browser. */
export class MemorySuiteRepository implements SuiteRepository {
  private readonly suites = new Map<string, TestSuite>()
  private readonly runs = new Map<string, SuiteRun>()

  public listSuites(workspaceId: string): Promise<TestSuite[]> {
    return Promise.resolve(this.entries(this.suites, workspaceId))
  }

  public saveSuite(workspaceId: string, suite: TestSuite): Promise<void> {
    this.suites.set(`${workspaceId}/${suite.id}`, structuredClone(suite))
    return Promise.resolve()
  }

  public deleteSuite(workspaceId: string, suiteId: string): Promise<void> {
    this.suites.delete(`${workspaceId}/${suiteId}`)
    return Promise.resolve()
  }

  public listRuns(workspaceId: string, suiteId: string): Promise<SuiteRun[]> {
    const runs = this.entries(this.runs, workspaceId).filter((run) => run.suiteId === suiteId)
    return Promise.resolve(runs.sort((a, b) => b.startedAt - a.startedAt))
  }

  public saveRun(workspaceId: string, run: SuiteRun): Promise<void> {
    this.runs.set(`${workspaceId}/${run.id}`, structuredClone(run))
    return Promise.resolve()
  }

  private entries<T>(map: Map<string, T>, workspaceId: string): T[] {
    return [...map].filter(([key]) => key.startsWith(`${workspaceId}/`)).map(([, value]) => structuredClone(value))
  }
}
