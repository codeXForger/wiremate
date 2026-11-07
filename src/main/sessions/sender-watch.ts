import type { WebContents } from 'electron'

/** Sends a session's events to the window that opened it, unless that window has gone. */
export function pushTo(sender: WebContents, channel: string): (event: unknown) => void {
  return (event) => {
    if (!sender.isDestroyed()) sender.send(channel, event)
  }
}

/** A reloaded, crashed or closed window can no longer use its sessions, so they close and free what they hold. */
export class SenderWatch {
  private readonly watched = new WeakSet<WebContents>()

  public constructor(private readonly closeAll: () => void) {}

  public watch(sender: WebContents): void {
    if (this.watched.has(sender)) return
    this.watched.add(sender)
    const closeAll = (): void => this.closeAll()
    sender.on('did-navigate', closeAll)
    sender.on('render-process-gone', closeAll)
    sender.once('destroyed', closeAll)
  }
}
