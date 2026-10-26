import { categoryTerms, type CategoryId } from '@shared/protocols/categories'
import { RequestFactory } from '@shared/protocols/request-factory'
import type { AnyRequest, ProtocolConfigMap, ProtocolId } from '@shared/types/protocol'
import type { TreeNode } from '@shared/types/workspace'
import { createId } from '@shared/utils/id'
import {
  canMoveNode,
  canPlaceNode,
  collectSubtreeIds,
  placeNode,
  renameNode,
  uniqueName,
  type PlacePosition
} from '@/features/explorer/tree-utils'
import { newItemName } from './draft-operations'
import type { TreeSlice } from './workspace-types'

export type TreeData = Pick<TreeSlice, 'nodes' | 'requests'>

export interface Insertion {
  id: string
  patch: TreeData
}

function withoutKeys<T>(record: Record<string, T>, keys: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.has(key)))
}

export function insertFolder(data: TreeData, parentId: string | null, category: CategoryId): Insertion {
  const name = uniqueName(data.nodes, parentId, `New ${categoryTerms(category).group}`)
  const node: TreeNode = { id: createId('fld'), parentId, kind: 'folder', name, category }
  return { id: node.id, patch: { ...data, nodes: [...data.nodes, node] } }
}

export function insertRequest(data: TreeData, parentId: string | null, protocol: ProtocolId): Insertion {
  const name = uniqueName(data.nodes, parentId, newItemName(protocol))
  const request = RequestFactory.create(protocol, name) as AnyRequest
  const node: TreeNode = { id: request.id, parentId, kind: 'request', name, protocol }
  const requests = { ...data.requests, [request.id]: request }
  return { id: request.id, patch: { nodes: [...data.nodes, node], requests } }
}

/** Copies a request next to the original as "<name> copy", with its own id. Returns null for anything else. */
export function duplicateInTree(data: TreeData, id: string): Insertion | null {
  const source = data.requests[id]
  const node = data.nodes.find((candidate) => candidate.id === id)
  if (!source || !node) return null
  const name = uniqueName(data.nodes, node.parentId, `${source.name} copy`)
  const copy = { ...structuredClone(source), id: createId('req'), name }
  const requests = { ...data.requests, [copy.id]: copy }
  const index = data.nodes.indexOf(node) + 1
  const nodes = [...data.nodes.slice(0, index), { ...node, id: copy.id, name }, ...data.nodes.slice(index)]
  return { id: copy.id, patch: { nodes, requests } }
}

export function renameInTree(data: TreeData, id: string, name: string): TreeData {
  const request = data.requests[id]
  const requests = request ? { ...data.requests, [id]: { ...request, name } } : data.requests
  return { nodes: renameNode(data.nodes, id, name), requests }
}

export function removeFromTree(data: TreeData, id: string): TreeData {
  const ids = collectSubtreeIds(data.nodes, id)
  return {
    nodes: data.nodes.filter((node) => !ids.has(node.id)),
    requests: withoutKeys(data.requests, ids)
  }
}

export function patchConfig<P extends ProtocolId>(
  data: TreeData,
  id: string,
  patch: Partial<ProtocolConfigMap[P]>
): TreeData {
  const request = data.requests[id]
  if (!request) return data
  const updated = { ...request, config: { ...request.config, ...patch } } as AnyRequest
  return { ...data, requests: { ...data.requests, [id]: updated } }
}

/** Moves a node into a folder (or the section root), as its last child. */
export function moveInTree(data: TreeData, id: string, parentId: string | null): TreeData {
  const node = data.nodes.find((candidate) => candidate.id === id)
  if (!node || !canMoveNode(data.nodes, id, parentId)) return data
  return { ...data, nodes: [...data.nodes.filter((other) => other.id !== id), { ...node, parentId }] }
}

/** Puts a node right before or after another one, which also moves it into that node's folder. */
export function placeInTree(data: TreeData, id: string, target: { id: string; position: PlacePosition }): TreeData {
  if (!canPlaceNode(data.nodes, id, target.id)) return data
  return { ...data, nodes: placeNode(data.nodes, id, target) }
}
