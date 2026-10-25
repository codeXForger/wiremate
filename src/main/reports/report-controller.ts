import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IpcChannel } from '@shared/ipc'
import type { SuiteRun } from '@shared/types/suite'
import { PdfReports } from './pdf-reports'

type Sender = Electron.WebContents

async function chooseFile(sender: Sender, suggestedName: string): Promise<string | null> {
  const options: Electron.SaveDialogOptions = {
    title: 'Save test run report',
    defaultPath: join(app.getPath('documents'), suggestedName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  }
  const window = BrowserWindow.fromWebContents(sender)
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)
  return result.canceled || !result.filePath ? null : result.filePath
}

/** Prints the report page in a hidden window that runs no scripts. */
async function renderPdf(html: string): Promise<Uint8Array> {
  const window = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true } })
  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    return await window.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true })
  } finally {
    window.destroy()
  }
}

/** Saves a suite run as a PDF report, and opens reports it saved. */
export class ReportController {
  private readonly reports = new PdfReports({ render: renderPdf, write: writeFile })

  public register(): void {
    ipcMain.handle(IpcChannel.savePdfReport, (event, run: SuiteRun) =>
      this.reports.save(run, (name) => chooseFile(event.sender, name))
    )
    ipcMain.handle(IpcChannel.openReport, async (_event, path: string) => {
      if (this.reports.wasSaved(path)) await shell.openPath(path)
    })
  }
}
