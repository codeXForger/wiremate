import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type WireMateApi } from '@shared/ipc'

const api: WireMateApi = {
  platform: process.platform,
  selectFolder: () => ipcRenderer.invoke(IpcChannel.selectFolder) as Promise<string | null>
}

contextBridge.exposeInMainWorld('wiremate', api)
