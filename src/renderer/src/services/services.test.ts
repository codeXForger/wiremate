import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestFactory } from '@shared/protocols/request-factory'
import { NativeFolderPicker } from './folder-picker'
import { MockWorkspaceRepository } from './mock-workspace-repository'
import { SimulatedRunner } from './simulated-runner'

describe('SimulatedRunner', () => {
  const runner = new SimulatedRunner(() => 42)

  it('echoes a request as a JSON exchange', () => {
    const response = runner.exchange(RequestFactory.create('http', 'x'))
    expect(response).toMatchObject({ kind: 'exchange', status: 200, statusText: 'OK' })
    expect(JSON.parse(response.body)).toMatchObject({ simulated: true, protocol: 'http' })
    expect(response.sizeBytes).toBe(new TextEncoder().encode(response.body).length)
  })

  it('records a session lifecycle', () => {
    const connected = runner.connect('ws://local')
    const sent = runner.send(connected, 'ping')
    const closed = runner.disconnect(sent)
    expect(closed.connected).toBe(false)
    expect(closed.events.map((e) => [e.direction, e.data])).toEqual([
      ['system', 'Connected to ws://local (simulated)'],
      ['out', 'ping'],
      ['in', 'ping'],
      ['system', 'Disconnected']
    ])
    expect(closed.events.every((e) => e.at === 42)).toBe(true)
  })
})

describe('MockWorkspaceRepository', () => {
  it('returns copies of the workspace list and empty content for new workspaces', async () => {
    const repo = new MockWorkspaceRepository()
    const list = await repo.listWorkspaces()
    list.pop()
    expect(await repo.listWorkspaces()).toHaveLength(1)
    const created = await repo.createWorkspace({ name: 'n', path: 'p' })
    expect(await repo.loadContent(created.id)).toEqual({ nodes: [], requests: {}, environments: [] })
  })
})

describe('NativeFolderPicker', () => {
  afterEach(() => {
    delete window.wiremate
  })

  it('returns null outside Electron', async () => {
    expect(await new NativeFolderPicker().pick()).toBeNull()
  })

  it('delegates to the preload bridge', async () => {
    window.wiremate = { platform: 'darwin', selectFolder: vi.fn().mockResolvedValue('/work') }
    expect(await new NativeFolderPicker().pick()).toBe('/work')
  })
})
