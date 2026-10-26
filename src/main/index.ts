import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { DialogController } from './dialog-controller'
import { HistoryFileStore } from './history/history-file-store'
import { HttpClient } from './http/http-client'
import { MessageFileStore } from './messages/message-file-store'
import { ReportController } from './reports/report-controller'
import { RequestController } from './request-controller'
import { ScriptRunner } from './scripting/script-runner'
import scriptWorkerPath from './scripting/script-worker?modulePath'
import { SocketCloseGuard } from './sockets/socket-close-guard'
import { SocketController } from './sockets/socket-controller'
import { SocketManager } from './sockets/socket-manager'
import { SuiteFileStore } from './suites/suite-file-store'
import { WindowFactory } from './window-factory'
import { WorkspaceController } from './workspace-controller'
import { WorkspaceFileStore } from './workspaces/workspace-file-store'
import { WorkspaceRegistry } from './workspaces/workspace-registry'
import { WorkspaceService } from './workspaces/workspace-service'

/** WIREMATE_HOME stands in for the home folder and the app data folder, so tests never touch the real ones. */
function storageLocations(): { home: string; appData: string } {
  const override = process.env['WIREMATE_HOME']
  if (override) return { home: override, appData: join(override, '.wiremate-app') }
  return { home: homedir(), appData: app.getPath('userData') }
}

const sockets = new SocketManager()

function registerControllers(): void {
  const { home, appData } = storageLocations()
  const registry = new WorkspaceRegistry(join(appData, 'workspaces.json'))
  const workspaces = new WorkspaceService({ registry, files: new WorkspaceFileStore(), home })
  new DialogController().register()
  new RequestController({
    http: new HttpClient(),
    scripts: new ScriptRunner({ workerPath: scriptWorkerPath })
  }).register()
  const stores = { suites: new SuiteFileStore(), history: new HistoryFileStore(), messages: new MessageFileStore() }
  new WorkspaceController(workspaces, stores).register()
  new ReportController().register()
  new SocketController(sockets).register()
}

const closeGuard = new SocketCloseGuard(sockets)
const createWindow = (): BrowserWindow => WindowFactory.create((window) => closeGuard.confirm(window))

function bootstrap(): void {
  registerControllers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

/** The windows asked before closing; whatever is still open (a crashed window's sockets) closes on the way out. */
app.on('will-quit', () => sockets.closeAll())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

void app.whenReady().then(bootstrap)
