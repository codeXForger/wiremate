import type { MessageStorageApi } from '@shared/ipc'
import { sortMessages } from '@shared/messages/message-factory'
import type { SavedMessage } from '@shared/types/message'

/** Storage boundary for saved socket payloads. In the app it is the preload bridge. */
export type MessageRepository = MessageStorageApi

/** Keeps messages in memory, for tests and for running the renderer in a plain browser. */
export class MemoryMessageRepository implements MessageRepository {
  private readonly messages = new Map<string, SavedMessage>()

  public listMessages(workspaceId: string): Promise<SavedMessage[]> {
    const own = [...this.messages].filter(([key]) => key.startsWith(`${workspaceId}/`))
    return Promise.resolve(sortMessages(own.map(([, message]) => structuredClone(message))))
  }

  public saveMessage(workspaceId: string, message: SavedMessage): Promise<void> {
    this.messages.set(`${workspaceId}/${message.id}`, structuredClone(message))
    return Promise.resolve()
  }

  public deleteMessage(workspaceId: string, messageId: string): Promise<void> {
    this.messages.delete(`${workspaceId}/${messageId}`)
    return Promise.resolve()
  }
}
