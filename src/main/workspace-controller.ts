import { ipcMain } from 'electron'
import {
  IpcChannel,
  type HistoryStorageApi,
  type MessageStorageApi,
  type SuiteStorageApi,
  type WorkspaceStorageApi
} from '@shared/ipc'
import type { HistoryFileStore } from './history/history-file-store'
import type { MessageFileStore } from './messages/message-file-store'
import type { SuiteFileStore } from './suites/suite-file-store'
import type { WorkspaceService } from './workspaces/workspace-service'

type Handlers = { [K in keyof WorkspaceStorageApi & keyof typeof IpcChannel]: WorkspaceStorageApi[K] }
type HistoryHandlers = { [K in keyof HistoryStorageApi & keyof typeof IpcChannel]: HistoryStorageApi[K] }
type Invoke = (...args: unknown[]) => Promise<unknown>
type SuiteHandlers = { [K in keyof SuiteStorageApi & keyof typeof IpcChannel]: SuiteStorageApi[K] }
type MessageHandlers = { [K in keyof MessageStorageApi & keyof typeof IpcChannel]: MessageStorageApi[K] }

interface WorkspaceStores {
  suites: SuiteFileStore
  history: HistoryFileStore
  messages: MessageFileStore
}

/**
 * Exposes workspace storage (collections, requests, environments, settings, suites, runs, history, messages) to the
 * renderer.
 */
export class WorkspaceController {
  public constructor(
    private readonly workspaces: WorkspaceService,
    private readonly stores: WorkspaceStores
  ) {}

  public register(): void {
    // Each handler's arguments are typed by the API; IPC hands them over untyped.
    const handlers = {
      ...this.workspaceHandlers(),
      ...this.suiteHandlers(),
      ...this.historyHandlers(),
      ...this.messageHandlers()
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
    const store = this.stores.suites
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
    const store = this.stores.history
    return {
      listHistory: async (id, category) => store.list(await root(id), category),
      addHistory: async (id, entry) => store.add(await root(id), entry),
      clearHistory: async (id, category) => store.clear(await root(id), category)
    }
  }

  private messageHandlers(): MessageHandlers {
    const root = (id: string): Promise<string> => this.workspaces.pathOf(id)
    const store = this.stores.messages
    return {
      listMessages: async (id) => store.list(await root(id)),
      saveMessage: async (id, message) => store.save(await root(id), message),
      deleteMessage: async (id, messageId) => store.delete(await root(id), messageId)
    }
  }
}
