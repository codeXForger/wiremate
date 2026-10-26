// @vitest-environment node
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createMessage } from '@shared/messages/message-factory'
import { MessageFileStore } from './message-file-store'

describe('MessageFileStore', () => {
  it('keeps one file per message, read back in list order', async () => {
    const root = mkdtempSync(join(tmpdir(), 'wiremate-messages-'))
    const store = new MessageFileStore()
    const second = createMessage('Second', 2, { payload: 'b', encoding: 'text', lineEnding: 'lf' })
    const first = createMessage('First', 1, { payload: 'ff', encoding: 'hex', lineEnding: 'none' })
    await store.save(root, second)
    await store.save(root, first)
    mkdirSync(join(root, 'messages'), { recursive: true })
    writeFileSync(join(root, 'messages', 'broken.json'), '{ not json')
    expect(await store.list(root)).toEqual([first, second])

    await store.delete(root, first.id)
    expect(await store.list(root)).toEqual([second])
    await expect(store.delete(root, '../escape')).rejects.toThrow('Invalid id')
  })
})
