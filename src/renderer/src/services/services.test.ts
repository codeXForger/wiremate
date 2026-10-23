import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestFactory } from '@shared/protocols/request-factory'
import { NativeFolderPicker } from './folder-picker'
import { MemoryWorkspaceRepository } from './workspace-repository'
import { SimulatedRunner } from './simulated-runner'
import { createWireMateStub } from '../../test/wiremate-stub'

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

describe('MemoryWorkspaceRepository', () => {
  it('creates a Default workspace when there is none, and reuses a folder', async () => {
    const repo = new MemoryWorkspaceRepository([], () => 7)
    const [first] = await repo.listWorkspaces()
    expect(first).toMatchObject({ name: 'Default', path: '~/WireMate/Default', lastOpenedAt: 7 })
    const again = await repo.createWorkspace({ name: 'Renamed', path: '~/WireMate/Default' })
    expect(again.id).toBe(first!.id)
    expect(await repo.listWorkspaces()).toHaveLength(1)
    await expect(repo.openWorkspace('nope')).rejects.toThrow('Unknown workspace nope')
  })

  it('keeps what is saved, as copies', async () => {
    const repo = new MemoryWorkspaceRepository()
    const { id } = await repo.createWorkspace({ name: 'W', path: '/w' })
    const request = RequestFactory.create('http', 'R')
    const env = { id: 'env_a', name: 'A', variables: [] }
    await repo.saveTree(id, [{ id: request.id, parentId: null, kind: 'request', name: 'R', protocol: 'http' }])
    await repo.saveRequest(id, request)
    await repo.saveEnvironment(id, env)
    await repo.saveEnvironment(id, { ...env, name: 'B' })
    await repo.saveSettings(id, { theme: 'light', activeEnvironmentId: 'env_a' })
    const content = await repo.openWorkspace(id)
    expect(content.requests[request.id]).toEqual(request)
    expect(content.environments).toEqual([{ ...env, name: 'B' }])
    expect(content.settings.theme).toBe('light')
    content.nodes.pop()
    expect((await repo.openWorkspace(id)).nodes).toHaveLength(1)
    await repo.deleteRequest(id, request.id)
    await repo.deleteEnvironment(id, 'env_a')
    expect(await repo.openWorkspace(id)).toMatchObject({ requests: {}, environments: [] })
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
    window.wiremate = createWireMateStub({ selectFolder: vi.fn().mockResolvedValue('/work') })
    expect(await new NativeFolderPicker().pick()).toBe('/work')
  })
})
