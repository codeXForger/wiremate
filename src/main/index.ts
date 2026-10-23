import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { DialogController } from './dialog-controller'
import { HttpClient } from './http/http-client'
import { RequestController } from './request-controller'
import { ScriptRunner } from './scripting/script-runner'
import scriptWorkerPath from './scripting/script-worker?modulePath'
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

function registerControllers(): void {
  const { home, appData } = storageLocations()
  const registry = new WorkspaceRegistry(join(appData, 'workspaces.json'))
  const workspaces = new WorkspaceService({ registry, files: new WorkspaceFileStore(), home })
  new DialogController().register()
  new RequestController({
    http: new HttpClient(),
    scripts: new ScriptRunner({ workerPath: scriptWorkerPath })
  }).register()
  new WorkspaceController(workspaces, new SuiteFileStore()).register()
}

function bootstrap(): void {
  registerControllers()
  WindowFactory.create()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) WindowFactory.create()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

void app.whenReady().then(bootstrap)
