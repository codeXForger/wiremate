import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { AppEvent } from '@shared/ipc'

/** How long a closing window waits for the renderer to save before it closes anyway. */
const CLOSE_GRACE_MS = 3000

/** Holding a window open cancels a quit in progress, so remember it and quit again once the window is gone. */
let quitting = false
app.on('before-quit', () => {
  quitting = true
})

export class WindowFactory {
  private static readonly MIN_SIZE = { width: 960, height: 600 }

  public static create(): BrowserWindow {
    const window = new BrowserWindow(WindowFactory.options())
    window.on('ready-to-show', () => window.show())
    window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)
      return { action: 'deny' }
    })
    WindowFactory.saveBeforeClosing(window)
    WindowFactory.load(window)
    return window
  }

  /** Holds the window open until the renderer has written its pending saves (or the grace period ends). */
  private static saveBeforeClosing(window: BrowserWindow): void {
    let closing = false
    window.on('close', (event) => {
      if (closing) return
      closing = true
      event.preventDefault()
      const close = (): void => WindowFactory.closeNow(window)
      ipcMain.once(AppEvent.readyToClose, close)
      setTimeout(close, CLOSE_GRACE_MS)
      window.webContents.send(AppEvent.beforeClose)
    })
  }

  private static closeNow(window: BrowserWindow): void {
    if (window.isDestroyed()) return
    window.destroy()
    if (quitting) app.quit()
  }

  private static options(): Electron.BrowserWindowConstructorOptions {
    return {
      width: 1440,
      height: 900,
      minWidth: WindowFactory.MIN_SIZE.width,
      minHeight: WindowFactory.MIN_SIZE.height,
      show: false,
      backgroundColor: '#161a23',
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 12 },
      webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: true }
    }
  }

  private static load(window: BrowserWindow): void {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl) void window.loadURL(devUrl)
    else void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
