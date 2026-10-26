import type { SuiteItem } from '@shared/types/suite'
import type { TreeNode } from '@shared/types/workspace'
import { childrenOf } from '../explorer/tree-utils'
import { httpRequestIds, type WorkspaceTree } from './suite-steps'

export type ItemKind = 'folder' | 'request' | 'missing'

export interface ItemView {
  name: string
  kind: ItemKind
  detail: string
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function describeRequest(tree: WorkspaceTree, node: TreeNode): ItemView {
  const request = tree.requests[node.id]
  const detail = request?.protocol === 'http' ? `${request.config.method} ${request.config.url}` : 'Not an HTTP request'
  return { name: node.name, kind: 'request', detail }
}

export function describeItem(item: SuiteItem, tree: WorkspaceTree): ItemView {
  const node = tree.nodes.find((candidate) => candidate.id === item.nodeId)
  if (!node) return { name: 'Missing item', kind: 'missing', detail: 'It was deleted from the workspace' }
  if (node.kind === 'request') return describeRequest(tree, node)
  return { name: node.name, kind: 'folder', detail: plural(httpRequestIds(tree.nodes, node.id).length, 'HTTP request') }
}

export interface AddableNode {
  node: TreeNode
  depth: number
}

/** Folders and requests of the API section, in explorer order, for the "Add to suite" menu. */
export function addableNodes(nodes: TreeNode[], parentId: string | null = null, depth = 0): AddableNode[] {
  return childrenOf(nodes, parentId, 'api').flatMap((node) => [
    { node, depth },
    ...(node.kind === 'folder' ? addableNodes(nodes, node.id, depth + 1) : [])
  ])
}
