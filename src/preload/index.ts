import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type WireMateApi } from '@shared/ipc'

type Invoke<K extends keyof WireMateApi> = WireMateApi[K]

/** Forwards a bridge method to its IPC channel. */
function invoker<K extends Exclude<keyof WireMateApi, 'platform'>>(method: K): Invoke<K> {
  return ((...args: unknown[]) => ipcRenderer.invoke(IpcChannel[method], ...args)) as Invoke<K>
}

const api: WireMateApi = {
  platform: process.platform,
  selectFolder: invoker('selectFolder'),
  sendHttp: invoker('sendHttp'),
  runScript: invoker('runScript'),
  listSuites: invoker('listSuites'),
  saveSuite: invoker('saveSuite'),
  deleteSuite: invoker('deleteSuite'),
  listRuns: invoker('listRuns'),
  saveRun: invoker('saveRun')
}

contextBridge.exposeInMainWorld('wiremate', api)
