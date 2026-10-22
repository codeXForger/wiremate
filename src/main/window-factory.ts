import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'

export class WindowFactory {
  private static readonly MIN_SIZE = { width: 960, height: 600 }

  public static create(): BrowserWindow {
    const window = new BrowserWindow(WindowFactory.options())
    window.on('ready-to-show', () => window.show())
    window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)
      return { action: 'deny' }
    })
    WindowFactory.load(window)
    return window
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
