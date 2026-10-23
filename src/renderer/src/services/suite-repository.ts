import type { SuiteStorageApi } from '@shared/ipc'
import type { SuiteRun, TestSuite } from '@shared/types/suite'

/** Storage boundary for test suites and their run history. */
export type SuiteRepository = SuiteStorageApi

function bridge(): SuiteStorageApi {
  if (!window.wiremate) throw new Error('The desktop bridge is not available')
  return window.wiremate
}

/** Writes suites as JSON files in the workspace folder, through the main process. */
export class BridgeSuiteRepository implements SuiteRepository {
  public listSuites(workspacePath: string): Promise<TestSuite[]> {
    return bridge().listSuites(workspacePath)
  }

  public saveSuite(workspacePath: string, suite: TestSuite): Promise<void> {
    return bridge().saveSuite(workspacePath, suite)
  }

  public deleteSuite(workspacePath: string, suiteId: string): Promise<void> {
    return bridge().deleteSuite(workspacePath, suiteId)
  }

  public listRuns(workspacePath: string, suiteId: string): Promise<SuiteRun[]> {
    return bridge().listRuns(workspacePath, suiteId)
  }

  public saveRun(workspacePath: string, run: SuiteRun): Promise<void> {
    return bridge().saveRun(workspacePath, run)
  }
}

/** Keeps suites in memory, for tests and for running the renderer in a plain browser. */
export class MemorySuiteRepository implements SuiteRepository {
  private readonly suites = new Map<string, TestSuite>()
  private readonly runs = new Map<string, SuiteRun>()

  public listSuites(workspacePath: string): Promise<TestSuite[]> {
    return Promise.resolve(this.entries(this.suites, workspacePath))
  }

  public saveSuite(workspacePath: string, suite: TestSuite): Promise<void> {
    this.suites.set(`${workspacePath}/${suite.id}`, structuredClone(suite))
    return Promise.resolve()
  }

  public deleteSuite(workspacePath: string, suiteId: string): Promise<void> {
    this.suites.delete(`${workspacePath}/${suiteId}`)
    return Promise.resolve()
  }

  public listRuns(workspacePath: string, suiteId: string): Promise<SuiteRun[]> {
    const runs = this.entries(this.runs, workspacePath).filter((run) => run.suiteId === suiteId)
    return Promise.resolve(runs.sort((a, b) => b.startedAt - a.startedAt))
  }

  public saveRun(workspacePath: string, run: SuiteRun): Promise<void> {
    this.runs.set(`${workspacePath}/${run.id}`, structuredClone(run))
    return Promise.resolve()
  }

  private entries<T>(map: Map<string, T>, workspacePath: string): T[] {
    return [...map].filter(([key]) => key.startsWith(`${workspacePath}/`)).map(([, value]) => structuredClone(value))
  }
}
