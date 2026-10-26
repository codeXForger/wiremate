import type { AnyRequest, RequestDocument } from '@shared/types/protocol'
import type { SuiteItem } from '@shared/types/suite'
import type { TreeNode } from '@shared/types/workspace'
import { childrenOf } from '../explorer/tree-utils'

/** One request a suite run will send, or the reason it cannot. */
export interface SuiteStep {
  requestId: string
  name: string
  request?: RequestDocument<'http'>
  skipReason?: string
}

export interface WorkspaceTree {
  nodes: TreeNode[]
  requests: Record<string, AnyRequest>
}

function toStep(tree: WorkspaceTree, requestId: string): SuiteStep {
  const request = tree.requests[requestId]
  if (request?.protocol === 'http') return { requestId, name: request.name, request }
  const name = request?.name ?? 'Missing request'
  const skipReason = request ? 'Only HTTP requests can run in a suite' : 'The request no longer exists'
  return { requestId, name, skipReason }
}

/** HTTP requests inside a folder, depth first, in the order the explorer shows them. */
export function httpRequestIds(nodes: TreeNode[], folderId: string): string[] {
  return childrenOf(nodes, folderId).flatMap((child) => {
    if (child.kind === 'folder') return httpRequestIds(nodes, child.id)
    return child.protocol === 'http' ? [child.id] : []
  })
}

function expandItem(tree: WorkspaceTree, item: SuiteItem): SuiteStep[] {
  const node = tree.nodes.find((candidate) => candidate.id === item.nodeId)
  if (node?.kind !== 'folder') return [toStep(tree, item.nodeId)]
  return httpRequestIds(tree.nodes, node.id).map((id) => toStep(tree, id))
}

/** Turns suite items into the ordered list of requests to send. Folders expand into their HTTP requests. */
export function expandSuite(items: SuiteItem[], tree: WorkspaceTree): SuiteStep[] {
  return items.flatMap((item) => expandItem(tree, item))
}
