import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type WireMateApi } from '@shared/ipc'

const api: WireMateApi = {
  platform: process.platform,
  selectFolder: () => ipcRenderer.invoke(IpcChannel.selectFolder) as Promise<string | null>,
  sendHttp: (request) => ipcRenderer.invoke(IpcChannel.sendHttp, request) as ReturnType<WireMateApi['sendHttp']>,
  runScript: (run) => ipcRenderer.invoke(IpcChannel.runScript, run) as ReturnType<WireMateApi['runScript']>
}

contextBridge.exposeInMainWorld('wiremate', api)
