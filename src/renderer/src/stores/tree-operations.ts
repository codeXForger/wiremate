import type { CategoryId } from '@shared/protocols/categories'
import { PROTOCOL_METADATA } from '@shared/protocols/metadata'
import { RequestFactory } from '@shared/protocols/request-factory'
import type { AnyRequest, ProtocolConfigMap, ProtocolId } from '@shared/types/protocol'
import type { TreeNode } from '@shared/types/workspace'
import { createId } from '@shared/utils/id'
import { collectSubtreeIds, renameNode, uniqueName } from '@/features/explorer/tree-utils'
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
  const name = uniqueName(data.nodes, parentId, 'New collection')
  const node: TreeNode = { id: createId('fld'), parentId, kind: 'folder', name, category }
  return { id: node.id, patch: { ...data, nodes: [...data.nodes, node] } }
}

export function insertRequest(data: TreeData, parentId: string | null, protocol: ProtocolId): Insertion {
  const name = uniqueName(data.nodes, parentId, `${PROTOCOL_METADATA[protocol].label} request`)
  const request = RequestFactory.create(protocol, name) as AnyRequest
  const node: TreeNode = { id: request.id, parentId, kind: 'request', name, protocol }
  const requests = { ...data.requests, [request.id]: request }
  return { id: request.id, patch: { nodes: [...data.nodes, node], requests } }
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
