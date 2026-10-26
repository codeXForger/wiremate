import { dialog, type BrowserWindow } from 'electron'
import type { SocketKind, SocketManager } from './socket-manager'

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/** "1 TCP server and 2 TCP clients" */
function describeOpen(kinds: SocketKind[]): string {
  const counts = new Map<SocketKind, number>()
  kinds.forEach((kind) => counts.set(kind, (counts.get(kind) ?? 0) + 1))
  return [...counts].map(([kind, count]) => plural(count, kind)).join(' and ')
}

/** Asks before a window with open sockets closes; when the user agrees, closes them so every peer sees it. */
export class SocketCloseGuard {
  public constructor(private readonly sockets: SocketManager) {}

  public async confirm(window: BrowserWindow): Promise<boolean> {
    const open = this.sockets.openKinds()
    if (open.length === 0) return true
    const { response } = await dialog.showMessageBox(window, {
      type: 'warning',
      buttons: ['Disconnect and close', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: `${describeOpen(open)} ${open.length === 1 ? 'is' : 'are'} still open`,
      detail: 'Closing WireMate stops servers and disconnects clients. Their peers see the connection close.'
    })
    if (response !== 0) return false
    this.sockets.closeAll()
    return true
  }
}
