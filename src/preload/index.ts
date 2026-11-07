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

/** What main pushes, by the bridge method that listens to it. */
const EVENTS = { onSocketEvent: AppEvent.socketEvent, onKafkaEvent: AppEvent.kafkaEvent } satisfies Partial<
  Record<keyof WireMateApi, string>
>

/** Listens to what main pushes on a channel; the returned function stops listening. */
function subscriber(channel: string): (listener: (event: unknown) => void) => () => void {
  return (listener) => {
    const forward = (_event: unknown, payload: unknown): void => listener(payload)
    ipcRenderer.on(channel, forward)
    return () => ipcRenderer.off(channel, forward)
  }
}

const api = {
  platform: process.platform,
  onBeforeClose,
  ...Object.fromEntries(Object.entries(EVENTS).map(([method, channel]) => [method, subscriber(channel)])),
  ...Object.fromEntries(METHODS.map((method) => [method, invoker(method)]))
} as WireMateApi

contextBridge.exposeInMainWorld('wiremate', api)
