// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RequestFactory } from '@shared/protocols/request-factory'
import type { TreeNode } from '@shared/types/workspace'
import { createKeyValue } from '@shared/utils/key-value'
import { WorkspaceFileStore } from './workspace-file-store'
import { WorkspaceRegistry } from './workspace-registry'
import { WorkspaceService } from './workspace-service'

function setup() {
  const home = mkdtempSync(join(tmpdir(), 'wiremate-home-'))
  let clock = 0
  const service = new WorkspaceService({
    registry: new WorkspaceRegistry(join(home, 'app', 'workspaces.json')),
    files: new WorkspaceFileStore(),
    home,
    now: () => (clock += 1)
  })
  return { home, service }
}

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'))

describe('WorkspaceService', () => {
  it('creates an empty Default workspace on first launch', async () => {
    const { home, service } = setup()
    const [workspace] = await service.list()
    expect(workspace).toMatchObject({ name: 'Default', path: join(home, 'WireMate', 'Default') })
    expect(read(join(home, 'WireMate', 'Default', 'wiremate.json'))).toMatchObject({ version: 1, name: 'Default' })
    expect(await service.list()).toHaveLength(1)
    expect(await service.open(workspace!.id)).toEqual({
      nodes: [],
      requests: {},
      environments: [],
      settings: { theme: 'dark', activeEnvironmentId: null }
    })
  })

  it('saves and loads every part of a workspace', async () => {
    const { home, service } = setup()
    const { id, path } = await service.create({ name: 'Payments', path: '~/work/payments' })
    expect(path).toBe(join(home, 'work', 'payments'))
    const request = { ...RequestFactory.create('http', 'Charge'), id: 'req_charge' }
    request.config.scripts.post = "wm.test('ok', () => {})"
    const folder: TreeNode = { id: 'fld_cards', parentId: null, kind: 'folder', name: 'Cards', category: 'api' }
    const node: TreeNode = { id: request.id, parentId: folder.id, kind: 'request', name: 'Charge', protocol: 'http' }
    const environment = { id: 'env_prod', name: 'Prod', variables: [createKeyValue('host', 'api.example.com')] }
    await service.saveTree(id, [folder, node])
    await service.saveRequest(id, request)
    await service.saveEnvironment(id, environment)
    await service.saveSettings(id, { theme: 'light', activeEnvironmentId: 'env_prod' })

    expect(read(join(path, 'requests', 'req_charge.json'))).toMatchObject({
      name: 'Charge',
      config: { scripts: request.config.scripts }
    })
    expect(await service.open(id)).toEqual({
      nodes: [folder, node],
      requests: { req_charge: request },
      environments: [environment],
      settings: { theme: 'light', activeEnvironmentId: 'env_prod' }
    })

    await service.deleteRequest(id, request.id)
    await service.deleteEnvironment(id, environment.id)
    const reloaded = await service.open(id)
    expect(reloaded.nodes).toEqual([folder])
    expect(reloaded.environments).toEqual([])
  })

  it('recovers from hand-edited or partial files', async () => {
    const { service } = setup()
    const { id, path } = await service.create({ name: 'Old', path: join(mkdtempSync(join(tmpdir(), 'ws-')), 'old') })
    mkdirSync(join(path, 'requests'), { recursive: true })
    writeFileSync(
      join(path, 'requests', 'req_old.json'),
      JSON.stringify({ id: 'req_old', name: 'Old', protocol: 'http', config: { url: 'http://x' } })
    )
    writeFileSync(join(path, 'requests', 'broken.json'), '{')
    writeFileSync(
      join(path, 'wiremate.json'),
      JSON.stringify({ version: 1, id, name: 'Old', settings: { theme: 'neon' } })
    )
    const content = await service.open(id)
    expect(content.nodes).toEqual([{ id: 'req_old', parentId: null, kind: 'request', name: 'Old', protocol: 'http' }])
    expect(content.requests['req_old']?.config).toMatchObject({
      url: 'http://x',
      method: 'GET',
      scripts: { pre: '', post: '' }
    })
    expect(content.settings).toEqual({ theme: 'dark', activeEnvironmentId: null })
  })

  it('reopens an existing workspace folder and keeps its content', async () => {
    const { service } = setup()
    const path = join(mkdtempSync(join(tmpdir(), 'ws-')), 'shared')
    const first = await service.create({ name: 'Shared', path })
    await service.saveSettings(first.id, { theme: 'light', activeEnvironmentId: null })
    const again = await service.create({ name: 'Renamed', path })
    expect(again.id).toBe(first.id)
    expect((await service.list()).map((ws) => ws.name)).toEqual(['Renamed'])
    expect((await service.open(first.id)).settings.theme).toBe('light')
  })

  it('marks the opened workspace as the most recent and rejects unknown ids', async () => {
    const { service } = setup()
    const a = await service.create({ name: 'A', path: join(mkdtempSync(join(tmpdir(), 'ws-')), 'a') })
    await service.open(a.id)
    const opened = (await service.list()).find((ws) => ws.id === a.id)
    expect(opened!.lastOpenedAt).toBeGreaterThan(a.lastOpenedAt)
    await expect(service.open('ws_nope')).rejects.toThrow('Unknown workspace ws_nope')
    await expect(service.saveRequest(a.id, { ...RequestFactory.create('http', 'x'), id: '../evil' })).rejects.toThrow()
    expect(existsSync(join(a.path, 'evil.json'))).toBe(false)
  })

  it('saves settings even when the manifest went missing', async () => {
    const { service } = setup()
    const workspace = await service.create({ name: 'Gone', path: join(mkdtempSync(join(tmpdir(), 'ws-')), 'gone') })
    writeFileSync(join(workspace.path, 'wiremate.json'), 'nope')
    await service.saveSettings(workspace.id, { theme: 'light', activeEnvironmentId: null })
    expect(read(join(workspace.path, 'wiremate.json'))).toMatchObject({
      name: 'Workspace',
      settings: { theme: 'light' }
    })
  })
})
