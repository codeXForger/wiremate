import { contextBridge, ipcRenderer } from 'electron'
import { AppEvent, IpcChannel, type WireMateApi } from '@shared/ipc'
import type { SocketEvent } from '@shared/types/socket'

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

function onSocketEvent(listener: (event: SocketEvent) => void): () => void {
  const forward = (_event: unknown, socketEvent: SocketEvent): void => listener(socketEvent)
  ipcRenderer.on(AppEvent.socketEvent, forward)
  return () => ipcRenderer.off(AppEvent.socketEvent, forward)
}

const api = {
  platform: process.platform,
  onBeforeClose,
  onSocketEvent,
  ...Object.fromEntries(METHODS.map((method) => [method, invoker(method)]))
} as WireMateApi

contextBridge.exposeInMainWorld('wiremate', api)
