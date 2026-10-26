import { categoryOf, categoryTerms } from '@shared/protocols/categories'
import { PROTOCOL_METADATA } from '@shared/protocols/metadata'
import { RequestFactory } from '@shared/protocols/request-factory'
import type { AnyRequest, ProtocolId } from '@shared/types/protocol'
import type { TreeNode } from '@shared/types/workspace'
import { uniqueName } from '@/features/explorer/tree-utils'
import type { TreeSlice } from './workspace-types'

export type DraftData = Pick<TreeSlice, 'nodes' | 'requests' | 'drafts'>

/** "TCP connection", "UDP request"…: what a new item of the protocol is called in its section. */
export function newItemName(protocol: ProtocolId): string {
  return `${PROTOCOL_METADATA[protocol].label} ${categoryTerms(categoryOf(protocol)).item}`
}

function draftNodes(data: DraftData): TreeNode[] {
  return Object.entries(data.drafts).flatMap(([id, parentId]) => {
    const request = data.requests[id]
    return request ? [{ id, parentId, kind: 'request' as const, name: request.name }] : []
  })
}

/** A request that exists only in its tab until it is saved: it is in `requests` but has no place in the tree. */
export function insertDraft(
  data: DraftData,
  parentId: string | null,
  protocol: ProtocolId
): { id: string; patch: DraftData } {
  const name = uniqueName([...data.nodes, ...draftNodes(data)], parentId, newItemName(protocol))
  const request = RequestFactory.create(protocol, name) as AnyRequest
  const patch = {
    nodes: data.nodes,
    requests: { ...data.requests, [request.id]: request },
    drafts: { ...data.drafts, [request.id]: parentId }
  }
  return { id: request.id, patch }
}

function withoutDraft(drafts: DraftData['drafts'], id: string): DraftData['drafts'] {
  return Object.fromEntries(Object.entries(drafts).filter(([draftId]) => draftId !== id))
}

/** Puts a draft in the tree under its name; from then on it is saved like any request. */
export function saveDraft(data: DraftData, id: string, name: string): DraftData {
  const request = data.requests[id]
  if (!request || !(id in data.drafts)) return data
  const parentId = data.drafts[id] ?? null
  const finalName = uniqueName(data.nodes, parentId, name.trim() || request.name)
  const node: TreeNode = { id, parentId, kind: 'request', name: finalName, protocol: request.protocol }
  const requests = { ...data.requests, [id]: { ...request, name: finalName } }
  return { nodes: [...data.nodes, node], requests, drafts: withoutDraft(data.drafts, id) }
}

export function discardDraft(data: DraftData, id: string): DraftData {
  if (!(id in data.drafts)) return data
  const requests = Object.fromEntries(Object.entries(data.requests).filter(([requestId]) => requestId !== id))
  return { nodes: data.nodes, requests, drafts: withoutDraft(data.drafts, id) }
}
