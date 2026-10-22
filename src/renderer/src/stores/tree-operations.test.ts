import { describe, expect, it } from 'vitest'
import {
  insertFolder,
  insertRequest,
  moveInTree,
  patchConfig,
  removeFromTree,
  renameInTree,
  type TreeData
} from './tree-operations'

const empty: TreeData = { nodes: [], requests: {} }

describe('tree operations', () => {
  it('inserts folders with unique names', () => {
    const first = insertFolder(empty, null, 'api')
    const second = insertFolder(first.patch, null, 'api')
    expect(second.patch.nodes[1]!.category).toBe('api')
    expect(second.patch.nodes.map((n) => n.name)).toEqual(['New collection', 'New collection 2'])
    expect(second.id).toMatch(/^fld_/)
  })

  it('inserts requests as nodes and documents', () => {
    const folder = insertFolder(empty, null, 'api')
    const { id, patch } = insertRequest(folder.patch, folder.id, 'kafka')
    expect(patch.nodes.find((n) => n.id === id)).toMatchObject({
      parentId: folder.id,
      protocol: 'kafka',
      name: 'Kafka request'
    })
    expect(patch.requests[id]?.protocol).toBe('kafka')
  })

  it('renames nodes and their request documents', () => {
    const folder = insertFolder(empty, null, 'api')
    const renamedFolder = renameInTree(folder.patch, folder.id, 'APIs')
    expect(renamedFolder.nodes[0]!.name).toBe('APIs')
    const req = insertRequest(empty, null, 'http')
    expect(renameInTree(req.patch, req.id, 'Login').requests[req.id]?.name).toBe('Login')
  })

  it('removes a folder with everything inside it', () => {
    const folder = insertFolder(empty, null, 'api')
    const req = insertRequest(folder.patch, folder.id, 'http')
    const result = removeFromTree(req.patch, folder.id)
    expect(result).toEqual({ nodes: [], requests: {} })
  })

  it('patches request config and ignores unknown ids', () => {
    const req = insertRequest(empty, null, 'http')
    const patched = patchConfig<'http'>(req.patch, req.id, { url: 'https://x.dev' })
    expect(patched.requests[req.id]?.config).toMatchObject({ url: 'https://x.dev', method: 'GET' })
    expect(patchConfig(req.patch, 'missing', {})).toBe(req.patch)
  })

  it('moves a node into a folder and ignores invalid moves', () => {
    const folder = insertFolder(empty, null, 'api')
    const req = insertRequest(folder.patch, null, 'http')
    const moved = moveInTree(req.patch, req.id, folder.id)
    expect(moved.nodes.find((n) => n.id === req.id)?.parentId).toBe(folder.id)
    expect(moveInTree(moved, folder.id, req.id)).toBe(moved)
  })
})
