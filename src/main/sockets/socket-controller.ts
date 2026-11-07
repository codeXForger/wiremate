import { ipcMain } from 'electron'
import { AppEvent, IpcChannel } from '@shared/ipc'
import type { SocketSpec } from '@shared/types/socket'
import { pushTo, SenderWatch } from '../sessions/sender-watch'
import type { SocketManager } from './socket-manager'

/** Exposes sockets to the renderer and pushes their events back to the window that opened them. */
export class SocketController {
  private readonly senders: SenderWatch

  public constructor(private readonly sockets: SocketManager) {
    this.senders = new SenderWatch(() => sockets.closeAll())
  }

  public register(): void {
    ipcMain.handle(IpcChannel.openSocket, (event, sessionId: string, spec: SocketSpec) => {
      this.senders.watch(event.sender)
      this.sockets.open(sessionId, spec, pushTo(event.sender, AppEvent.socketEvent))
    })
    ipcMain.handle(IpcChannel.sendSocket, (_event, sessionId: string, ...message: [Uint8Array, string?]) =>
      this.sockets.send(sessionId, ...message)
    )
    ipcMain.handle(IpcChannel.closeSocket, (_event, sessionId: string) => this.sockets.close(sessionId))
  }
}
