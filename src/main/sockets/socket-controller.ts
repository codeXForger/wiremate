import { ipcMain, type WebContents } from 'electron'
import { AppEvent, IpcChannel } from '@shared/ipc'
import type { SocketSpec } from '@shared/types/socket'
import type { SocketManager } from './socket-manager'

/** Exposes sockets to the renderer and pushes their events back to the window that opened them. */
export class SocketController {
  private readonly watched = new WeakSet<WebContents>()

  public constructor(private readonly sockets: SocketManager) {}

  public register(): void {
    ipcMain.handle(IpcChannel.openSocket, (event, sessionId: string, spec: SocketSpec) => {
      this.watch(event.sender)
      this.sockets.open(sessionId, spec, (socketEvent) => {
        if (!event.sender.isDestroyed()) event.sender.send(AppEvent.socketEvent, socketEvent)
      })
    })
    ipcMain.handle(IpcChannel.sendSocket, (_event, sessionId: string, ...message: [Uint8Array, string?]) =>
      this.sockets.send(sessionId, ...message)
    )
    ipcMain.handle(IpcChannel.closeSocket, (_event, sessionId: string) => this.sockets.close(sessionId))
  }

  /** A reloaded, crashed or closed window can no longer use its sockets, so they close and free their ports. */
  private watch(sender: WebContents): void {
    if (this.watched.has(sender)) return
    this.watched.add(sender)
    const closeAll = (): void => this.sockets.closeAll()
    sender.on('did-navigate', closeAll)
    sender.on('render-process-gone', closeAll)
    sender.once('destroyed', closeAll)
  }
}
