import type { AnyRequest, KeyValue, ProtocolId } from './protocol'

export interface Workspace {
  id: string
  name: string
  path: string
  lastOpenedAt: number
}

export type TreeNodeKind = 'folder' | 'request'

export interface TreeNode {
  id: string
  parentId: string | null
  kind: TreeNodeKind
  name: string
  protocol?: ProtocolId
}

export interface Environment {
  id: string
  name: string
  variables: KeyValue[]
}

export interface WorkspaceContent {
  nodes: TreeNode[]
  requests: Record<string, AnyRequest>
  environments: Environment[]
}
