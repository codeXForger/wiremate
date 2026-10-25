import { describe, expect, it } from 'vitest'
import { RequestFactory } from '@shared/protocols/request-factory'
import { runPassed, summarizeRun } from '@shared/suites/run-summary'
import { isSuiteId } from '@shared/suites/suite-factory'
import type { AnyRequest } from '@shared/types/protocol'
import type { SuiteItem } from '@shared/types/suite'
import type { TreeNode } from '@shared/types/workspace'
import { isCovered, pickerChanges, pickerRows, selectionInOrder, toggleSelection } from './item-picker'
import { addableNodes, describeItem } from './suite-items'
import { appendItems, applyChanges, moveItem, removeItem } from './suite-operations'

const items: SuiteItem[] = ['a', 'b', 'c'].map((id) => ({ id, nodeId: `n_${id}` }))
const ids = (list: SuiteItem[]) => list.map((item) => item.id)

describe('suite operations', () => {
  it('appends, removes and moves items', () => {
    expect(
      appendItems(items, ['n_d', 'n_e'])
        .map((item) => item.nodeId)
        .slice(-2)
    ).toEqual(['n_d', 'n_e'])
    expect(ids(removeItem(items, 'b'))).toEqual(['a', 'c'])
    expect(ids(moveItem(items, 0, 2))).toEqual(['b', 'c', 'a'])
    expect(ids(moveItem(items, 2, 0))).toEqual(['c', 'a', 'b'])
    expect(moveItem(items, 1, 1)).toBe(items)
    expect(moveItem(items, 0, 3)).toBe(items)
    expect(moveItem(items, 5, 0)).toBe(items)
  })
})

describe('suite items', () => {
  const request = { ...RequestFactory.create('http', 'Get user'), id: 'r1' }
  const socket = { ...RequestFactory.create('websocket', 'Socket'), id: 'r2' } as AnyRequest
  const nodes: TreeNode[] = [
    { id: 'f1', parentId: null, kind: 'folder', name: 'Users', category: 'api' },
    { id: 'r1', parentId: 'f1', kind: 'request', name: 'Get user', protocol: 'http' },
    { id: 'r2', parentId: null, kind: 'request', name: 'Socket', protocol: 'websocket' },
    { id: 'f2', parentId: null, kind: 'folder', name: 'Empty', category: 'api' }
  ]
  const tree = { nodes, requests: { r1: request, r2: socket } }

  it('describes folders, requests and missing items', () => {
    expect(describeItem({ id: 'i', nodeId: 'f1' }, tree)).toEqual({
      name: 'Users',
      kind: 'folder',
      detail: '1 HTTP request'
    })
    expect(describeItem({ id: 'i', nodeId: 'f2' }, tree).detail).toBe('0 HTTP requests')
    expect(describeItem({ id: 'i', nodeId: 'r1' }, tree).detail).toBe('GET https://httpbin.org/get')
    expect(describeItem({ id: 'i', nodeId: 'r2' }, tree).detail).toBe('Not an HTTP request')
    expect(describeItem({ id: 'i', nodeId: 'zz' }, tree).kind).toBe('missing')
  })

  it('lists API folders and requests with their depth', () => {
    expect(addableNodes(nodes).map(({ node, depth }) => [node.name, depth])).toEqual([
      ['Users', 0],
      ['Get user', 1],
      ['Empty', 0]
    ])
  })
})

describe('run summary helpers', () => {
  it('reports whether a run passed', () => {
    expect(runPassed(summarizeRun([], 0))).toBe(true)
    expect(isSuiteId('suite_1')).toBe(true)
    expect(isSuiteId('req_1')).toBe(false)
  })
})

describe('item picker', () => {
  const nodes: TreeNode[] = [
    { id: 'f1', parentId: null, kind: 'folder', name: 'Users', category: 'api' },
    { id: 'f2', parentId: 'f1', kind: 'folder', name: 'Admin', category: 'api' },
    { id: 'r1', parentId: 'f2', kind: 'request', name: 'Ban user', protocol: 'http' },
    { id: 'r2', parentId: 'f1', kind: 'request', name: 'List', protocol: 'http' },
    { id: 'r3', parentId: null, kind: 'request', name: 'Health', protocol: 'http' }
  ]
  const ids = (rows: { node: TreeNode }[]) => rows.map((row) => row.node.id)

  it('shows matches with the folders above them and everything inside a matching folder', () => {
    expect(ids(pickerRows(nodes, ''))).toEqual(['f1', 'f2', 'r1', 'r2', 'r3'])
    expect(ids(pickerRows(nodes, 'BAN'))).toEqual(['f1', 'f2', 'r1'])
    expect(ids(pickerRows(nodes, 'admin'))).toEqual(['f1', 'f2', 'r1'])
    expect(ids(pickerRows(nodes, '  '))).toHaveLength(5)
  })

  it('lets a folder cover what is inside it and adds in tree order', () => {
    let selected = toggleSelection(nodes, new Set(), 'r3')
    selected = toggleSelection(nodes, selected, 'r1')
    selected = toggleSelection(nodes, selected, 'f1')
    expect([...selected].sort()).toEqual(['f1', 'r3'])
    expect(isCovered(nodes, selected, 'r1')).toBe(true)
    expect(selectionInOrder(nodes, selected)).toEqual(['f1', 'r3'])
    expect([...toggleSelection(nodes, selected, 'f1')]).toEqual(['r3'])
  })
})

describe('picker changes', () => {
  const nodes: TreeNode[] = [
    { id: 'f1', parentId: null, kind: 'folder', name: 'Users', category: 'api' },
    { id: 'r1', parentId: 'f1', kind: 'request', name: 'List', protocol: 'http' },
    { id: 'r2', parentId: null, kind: 'request', name: 'Health', protocol: 'http' }
  ]

  it('adds what was ticked, removes what was unticked, and leaves deleted items alone', () => {
    const initial = new Set(['r1', 'gone'])
    expect(pickerChanges(nodes, initial, new Set(['r1', 'gone']))).toEqual({ added: [], removed: [] })
    expect(pickerChanges(nodes, initial, new Set(['r2', 'gone']))).toEqual({ added: ['r2'], removed: ['r1'] })
    expect(pickerChanges(nodes, initial, new Set(['f1', 'r1']))).toEqual({ added: ['f1'], removed: ['r1'] })
  })

  it('applies changes, keeping the order of what stays', () => {
    const items = [
      { id: 'a', nodeId: 'r1' },
      { id: 'b', nodeId: 'r2' },
      { id: 'c', nodeId: 'r1' }
    ]
    const next = applyChanges(items, { added: ['f1'], removed: ['r1'] })
    expect(next.map((item) => item.nodeId)).toEqual(['r2', 'f1'])
    expect(next[0]!.id).toBe('b')
  })
})
