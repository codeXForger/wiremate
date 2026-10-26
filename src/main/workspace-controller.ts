import { ipcMain } from 'electron'
import { IpcChannel, type HistoryStorageApi, type SuiteStorageApi, type WorkspaceStorageApi } from '@shared/ipc'
import type { HistoryFileStore } from './history/history-file-store'
import type { SuiteFileStore } from './suites/suite-file-store'
import type { WorkspaceService } from './workspaces/workspace-service'

type Handlers = { [K in keyof WorkspaceStorageApi & keyof typeof IpcChannel]: WorkspaceStorageApi[K] }
type HistoryHandlers = { [K in keyof HistoryStorageApi & keyof typeof IpcChannel]: HistoryStorageApi[K] }
type Invoke = (...args: unknown[]) => Promise<unknown>
type SuiteHandlers = { [K in keyof SuiteStorageApi & keyof typeof IpcChannel]: SuiteStorageApi[K] }

/** Exposes workspace storage (collections, requests, environments, settings, suites, runs) to the renderer. */
export class WorkspaceController {
  public constructor(
    private readonly workspaces: WorkspaceService,
    private readonly suites: SuiteFileStore,
    private readonly history: HistoryFileStore
  ) {}

  public register(): void {
    // Each handler's arguments are typed by the API; IPC hands them over untyped.
    const handlers = {
      ...this.workspaceHandlers(),
      ...this.suiteHandlers(),
      ...this.historyHandlers()
    } as unknown as Record<string, Invoke>
    for (const [method, handler] of Object.entries(handlers)) {
      ipcMain.handle(IpcChannel[method as keyof typeof IpcChannel], (_event, ...args: unknown[]) => handler(...args))
    }
  }

  private workspaceHandlers(): Handlers {
    const service = this.workspaces
    return {
      listWorkspaces: () => service.list(),
      createWorkspace: (input) => service.create(input),
      openWorkspace: (id) => service.open(id),
      saveTree: (id, nodes) => service.saveTree(id, nodes),
      saveRequest: (id, request) => service.saveRequest(id, request),
      deleteRequest: (id, requestId) => service.deleteRequest(id, requestId),
      saveEnvironment: (id, environment) => service.saveEnvironment(id, environment),
      deleteEnvironment: (id, environmentId) => service.deleteEnvironment(id, environmentId),
      saveSettings: (id, settings) => service.saveSettings(id, settings)
    }
  }

  /** Suites live in the workspace folder too; the id is resolved to the folder here. */
  private suiteHandlers(): SuiteHandlers {
    const root = (id: string): Promise<string> => this.workspaces.pathOf(id)
    const store = this.suites
    return {
      listSuites: async (id) => store.listSuites(await root(id)),
      saveSuite: async (id, suite) => store.saveSuite(await root(id), suite),
      deleteSuite: async (id, suiteId) => store.deleteSuite(await root(id), suiteId),
      listRuns: async (id, suiteId) => store.listRuns(await root(id), suiteId),
      saveRun: async (id, run) => store.saveRun(await root(id), run)
    }
  }

  private historyHandlers(): HistoryHandlers {
    const root = (id: string): Promise<string> => this.workspaces.pathOf(id)
    const store = this.history
    return {
      listHistory: async (id, category) => store.list(await root(id), category),
      addHistory: async (id, entry) => store.add(await root(id), entry),
      clearHistory: async (id, category) => store.clear(await root(id), category)
    }
  }
}
