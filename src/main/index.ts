import { app, BrowserWindow } from 'electron'
import { DialogController } from './dialog-controller'
import { WindowFactory } from './window-factory'

function bootstrap(): void {
  new DialogController().register()
  WindowFactory.create()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) WindowFactory.create()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

void app.whenReady().then(bootstrap)
