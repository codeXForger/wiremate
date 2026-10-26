import { describe, expect, it } from 'vitest'
import type { TreeNode } from '@shared/types/workspace'
import {
  canMoveNode,
  canPlaceNode,
  childrenOf,
  collectSubtreeIds,
  nodeCategory,
  placeNode,
  renameNode,
  uniqueName
} from './tree-utils'

const nodes: TreeNode[] = [
  { id: 'r1', parentId: null, kind: 'request', name: 'b request', protocol: 'http' },
  { id: 'f1', parentId: null, kind: 'folder', name: 'z folder', category: 'kafka' },
  { id: 'f2', parentId: null, kind: 'folder', name: 'a folder' },
  { id: 'f3', parentId: 'f1', kind: 'folder', name: 'nested' },
  { id: 'r2', parentId: 'f3', kind: 'request', name: 'deep', protocol: 'kafka' },
  { id: 'r3', parentId: null, kind: 'request', name: 'a request', protocol: 'udp' }
]

describe('childrenOf', () => {
  it('keeps the order the user arranged, not alphabetical', () => {
    expect(childrenOf(nodes, null).map((n) => n.id)).toEqual(['r1', 'f1', 'f2', 'r3'])
  })
})

describe('categories', () => {
  it('derives request categories from protocol and folder categories from the node', () => {
    expect(nodeCategory(nodes[0]!)).toBe('api')
    expect(nodeCategory(nodes[1]!)).toBe('kafka')
    expect(nodeCategory(nodes[2]!)).toBe('api')
    expect(nodeCategory(nodes[5]!)).toBe('network')
  })

  it('filters a level to one category', () => {
    expect(childrenOf(nodes, null, 'kafka').map((n) => n.id)).toEqual(['f1'])
    expect(childrenOf(nodes, null, 'network').map((n) => n.id)).toEqual(['r3'])
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

describe('canMoveNode', () => {
  const tree: TreeNode[] = [
    { id: 'a', parentId: null, kind: 'folder', name: 'A', category: 'api' },
    { id: 'a1', parentId: 'a', kind: 'folder', name: 'A1', category: 'api' },
    { id: 'b', parentId: null, kind: 'folder', name: 'B', category: 'api' },
    { id: 'k', parentId: null, kind: 'folder', name: 'K', category: 'kafka' },
    { id: 'req', parentId: 'a', kind: 'request', name: 'R', protocol: 'http' }
  ]

  it.each<{ name: string; id: string; target: string | null; allowed: boolean }>([
    { name: 'a request into another folder of its section', id: 'req', target: 'b', allowed: true },
    { name: 'a request to the section root', id: 'req', target: null, allowed: true },
    { name: 'a folder into a sibling folder', id: 'b', target: 'a1', allowed: true },
    { name: 'into its current parent', id: 'req', target: 'a', allowed: false },
    { name: 'into another section', id: 'req', target: 'k', allowed: false },
    { name: 'onto a request', id: 'b', target: 'req', allowed: false },
    { name: 'a folder into itself', id: 'a', target: 'a', allowed: false },
    { name: 'a folder into its own subfolder', id: 'a', target: 'a1', allowed: false },
    { name: 'an unknown node', id: 'missing', target: 'b', allowed: false },
    { name: 'into an unknown folder', id: 'req', target: 'missing', allowed: false }
  ])('moving $name → $allowed', ({ id, target, allowed }) => {
    expect(canMoveNode(tree, id, target)).toBe(allowed)
  })
})

describe('placing nodes', () => {
  const api: TreeNode[] = [
    { id: 'a', parentId: null, kind: 'request', name: 'a', protocol: 'http' },
    { id: 'f', parentId: null, kind: 'folder', name: 'f', category: 'api' },
    { id: 'b', parentId: 'f', kind: 'request', name: 'b', protocol: 'http' },
    { id: 'c', parentId: 'f', kind: 'request', name: 'c', protocol: 'http' },
    { id: 'k', parentId: null, kind: 'folder', name: 'kafka', category: 'kafka' }
  ]
  const order = (list: TreeNode[], parentId: string | null) => childrenOf(list, parentId).map((n) => n.id)

  it('reorders within a folder', () => {
    expect(order(placeNode(api, 'c', { id: 'b', position: 'before' }), 'f')).toEqual(['c', 'b'])
    expect(order(placeNode(api, 'b', { id: 'c', position: 'after' }), 'f')).toEqual(['c', 'b'])
  })

  it("moves into the target node's folder", () => {
    const moved = placeNode(api, 'a', { id: 'b', position: 'after' })
    expect(order(moved, 'f')).toEqual(['b', 'a', 'c'])
    expect(order(moved, null)).toEqual(['f', 'k'])
  })

  it('refuses itself, its own subtree, other sections and unknown nodes', () => {
    expect(canPlaceNode(api, 'b', 'c')).toBe(true)
    expect(canPlaceNode(api, 'b', 'b')).toBe(false)
    expect(canPlaceNode(api, 'f', 'b')).toBe(false)
    expect(canPlaceNode(api, 'a', 'k')).toBe(false)
    expect(canPlaceNode(api, 'a', 'nope')).toBe(false)
    expect(placeNode(api, 'nope', { id: 'a', position: 'after' })).toBe(api)
  })
})
