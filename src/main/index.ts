import { app, BrowserWindow } from 'electron'
import { DialogController } from './dialog-controller'
import { HttpClient } from './http/http-client'
import { RequestController } from './request-controller'
import { ScriptRunner } from './scripting/script-runner'
import scriptWorkerPath from './scripting/script-worker?modulePath'
import { WindowFactory } from './window-factory'

function bootstrap(): void {
  new DialogController().register()
  new RequestController({
    http: new HttpClient(),
    scripts: new ScriptRunner({ workerPath: scriptWorkerPath })
  }).register()
  WindowFactory.create()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) WindowFactory.create()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

void app.whenReady().then(bootstrap)
