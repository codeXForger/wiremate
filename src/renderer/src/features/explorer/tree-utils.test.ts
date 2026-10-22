import { describe, expect, it } from 'vitest'
import type { TreeNode } from '@shared/types/workspace'
import { childrenOf, collectSubtreeIds, renameNode, uniqueName } from './tree-utils'

const nodes: TreeNode[] = [
  { id: 'r1', parentId: null, kind: 'request', name: 'b request', protocol: 'http' },
  { id: 'f1', parentId: null, kind: 'folder', name: 'z folder' },
  { id: 'f2', parentId: null, kind: 'folder', name: 'a folder' },
  { id: 'f3', parentId: 'f1', kind: 'folder', name: 'nested' },
  { id: 'r2', parentId: 'f3', kind: 'request', name: 'deep', protocol: 'kafka' },
  { id: 'r3', parentId: null, kind: 'request', name: 'a request', protocol: 'udp' }
]

describe('childrenOf', () => {
  it('lists folders first, then requests, each alphabetically', () => {
    expect(childrenOf(nodes, null).map((n) => n.id)).toEqual(['f2', 'f1', 'r3', 'r1'])
  })
})

describe('collectSubtreeIds', () => {
  it('includes the root and every descendant', () => {
    expect([...collectSubtreeIds(nodes, 'f1')].sort()).toEqual(['f1', 'f3', 'r2'])
  })

  it('returns only the node for a leaf', () => {
    expect([...collectSubtreeIds(nodes, 'r1')]).toEqual(['r1'])
  })
})

describe('uniqueName', () => {
  it('keeps a free name and numbers taken ones', () => {
    expect(uniqueName(nodes, null, 'fresh')).toBe('fresh')
    const withCopies: TreeNode[] = [...nodes, { id: 'x', parentId: null, kind: 'folder', name: 'a folder 2' }]
    expect(uniqueName(withCopies, null, 'a folder')).toBe('a folder 3')
  })
})

describe('renameNode', () => {
  it('renames only the matching node', () => {
    const renamed = renameNode(nodes, 'f2', 'renamed')
    expect(renamed.find((n) => n.id === 'f2')?.name).toBe('renamed')
    expect(renamed.find((n) => n.id === 'f1')).toBe(nodes[1])
  })
})
