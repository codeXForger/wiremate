import { describe, expect, it } from 'vitest'
import { AppEvent, IpcChannel } from './ipc'

describe('IpcChannel', () => {
  it('uses unique, namespaced channel names', () => {
    const names = [...Object.values(IpcChannel), ...Object.values(AppEvent)]
    expect(new Set(names).size).toBe(names.length)
    names.forEach((name) => expect(name).toMatch(/^[a-z]+:[a-z-]+$/))
  })
})
