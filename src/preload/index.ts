import { contextBridge, ipcRenderer } from 'electron'
import { AppEvent, IpcChannel, type WireMateApi } from '@shared/ipc'

type Method = keyof typeof IpcChannel

/** Forwards a bridge method to its IPC channel. */
function invoker<K extends Method>(method: K): WireMateApi[K] {
  return ((...args: unknown[]) => ipcRenderer.invoke(IpcChannel[method], ...args)) as WireMateApi[K]
}

const METHODS = Object.keys(IpcChannel) as Method[]

function onBeforeClose(finish: () => Promise<void>): void {
  ipcRenderer.on(AppEvent.beforeClose, () => {
    void finish().finally(() => ipcRenderer.send(AppEvent.readyToClose))
  })
}

const api = {
  platform: process.platform,
  onBeforeClose,
  ...Object.fromEntries(METHODS.map((method) => [method, invoker(method)]))
} as WireMateApi

contextBridge.exposeInMainWorld('wiremate', api)
