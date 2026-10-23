import { homedir } from 'node:os'
import { app, BrowserWindow } from 'electron'
import { DialogController } from './dialog-controller'
import { HttpClient } from './http/http-client'
import { RequestController } from './request-controller'
import { ScriptRunner } from './scripting/script-runner'
import scriptWorkerPath from './scripting/script-worker?modulePath'
import { SuiteController } from './suite-controller'
import { SuiteFileStore } from './suites/suite-file-store'
import { WindowFactory } from './window-factory'

function bootstrap(): void {
  new DialogController().register()
  new RequestController({
    http: new HttpClient(),
    scripts: new ScriptRunner({ workerPath: scriptWorkerPath })
  }).register()
  // WIREMATE_HOME lets the end-to-end tests keep `~` workspaces out of the real home folder.
  new SuiteController(new SuiteFileStore(process.env['WIREMATE_HOME'] ?? homedir())).register()
  WindowFactory.create()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) WindowFactory.create()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

void app.whenReady().then(bootstrap)
