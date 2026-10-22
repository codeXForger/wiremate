import { describe, expect, it } from 'vitest'
import { IpcChannel } from './ipc'

describe('IpcChannel', () => {
  it('uses unique, namespaced channel names', () => {
    const names = Object.values(IpcChannel)
    expect(new Set(names).size).toBe(names.length)
    names.forEach((name) => expect(name).toMatch(/^[a-z]+:[a-z-]+$/))
  })
})
