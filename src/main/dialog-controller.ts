import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IpcChannel } from '@shared/ipc'

export class DialogController {
  public register(): void {
    ipcMain.handle(IpcChannel.selectFolder, (event) => this.selectFolder(event.sender))
  }

  private async selectFolder(sender: Electron.WebContents): Promise<string | null> {
    const window = BrowserWindow.fromWebContents(sender)
    const options: Electron.OpenDialogOptions = {
      title: 'Choose workspace folder',
      properties: ['openDirectory', 'createDirectory']
    }
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }
}
