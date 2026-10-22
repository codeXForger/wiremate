import type { TreeNode } from '@shared/types/workspace'

function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
  return a.name.localeCompare(b.name)
}

export function childrenOf(nodes: TreeNode[], parentId: string | null): TreeNode[] {
  return nodes.filter((node) => node.parentId === parentId).sort(compareNodes)
}

export function collectSubtreeIds(nodes: TreeNode[], rootId: string): Set<string> {
  const ids = new Set([rootId])
  let grew = true
  while (grew) {
    const before = ids.size
    nodes.forEach((node) => node.parentId && ids.has(node.parentId) && ids.add(node.id))
    grew = ids.size > before
  }
  return ids
}

export function uniqueName(nodes: TreeNode[], parentId: string | null, base: string): string {
  const taken = new Set(childrenOf(nodes, parentId).map((node) => node.name))
  let name = base
  for (let n = 2; taken.has(name); n += 1) name = `${base} ${n}`
  return name
}

export function renameNode(nodes: TreeNode[], id: string, name: string): TreeNode[] {
  return nodes.map((node) => (node.id === id ? { ...node, name } : node))
}
