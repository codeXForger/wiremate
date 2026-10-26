import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { sortMessages } from '@shared/messages/message-factory'
import { SavedMessageSchema } from '@shared/messages/message-schema'
import { SafeId } from '@shared/suites/suite-schema'
import type { SavedMessage } from '@shared/types/message'
import { WORKSPACE_FILES } from '@shared/workspace/workspace-files'
import { readJsonFolder, writeJson } from '../storage/json-files'

/** Keeps saved socket payloads in the workspace folder, one file each (they can be large): `messages/<id>.json`. */
export class MessageFileStore {
  public async list(root: string): Promise<SavedMessage[]> {
    return sortMessages(await readJsonFolder(join(root, WORKSPACE_FILES.messages), SavedMessageSchema))
  }

  public async save(root: string, message: SavedMessage): Promise<void> {
    const valid = SavedMessageSchema.parse(message)
    await writeJson(join(root, WORKSPACE_FILES.messages, `${valid.id}.json`), valid)
  }

  public async delete(root: string, messageId: string): Promise<void> {
    await rm(join(root, WORKSPACE_FILES.messages, `${SafeId.parse(messageId)}.json`), { force: true })
  }
}
