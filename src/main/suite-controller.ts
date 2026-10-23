import { ipcMain } from 'electron'
import { IpcChannel, type SuiteStorageApi } from '@shared/ipc'
import type { SuiteRun, TestSuite } from '@shared/types/suite'
import type { SuiteFileStore } from './suites/suite-file-store'

type Event = Electron.IpcMainInvokeEvent

/** Exposes suite and run-history storage to the renderer. */
export class SuiteController {
  public constructor(private readonly store: SuiteFileStore) {}

  public register(): void {
    const store: SuiteStorageApi = this.store
    ipcMain.handle(IpcChannel.listSuites, (_: Event, path: string) => store.listSuites(path))
    ipcMain.handle(IpcChannel.saveSuite, (_: Event, path: string, suite: TestSuite) => store.saveSuite(path, suite))
    ipcMain.handle(IpcChannel.deleteSuite, (_: Event, path: string, id: string) => store.deleteSuite(path, id))
    ipcMain.handle(IpcChannel.listRuns, (_: Event, path: string, id: string) => store.listRuns(path, id))
    ipcMain.handle(IpcChannel.saveRun, (_: Event, path: string, run: SuiteRun) => store.saveRun(path, run))
  }
}
