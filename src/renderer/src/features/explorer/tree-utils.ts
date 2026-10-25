import { categoryOf, type CategoryId } from '@shared/protocols/categories'
import type { TreeNode } from '@shared/types/workspace'

export function nodeCategory(node: TreeNode): CategoryId {
  return node.protocol ? categoryOf(node.protocol) : (node.category ?? 'api')
}

/** A folder's children in the order the user arranged them, which is their order in `nodes`. */
export function childrenOf(nodes: TreeNode[], parentId: string | null, category?: CategoryId): TreeNode[] {
  const matches = (node: TreeNode): boolean => !category || nodeCategory(node) === category
  return nodes.filter((node) => node.parentId === parentId && matches(node))
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

/** A node can move into a folder of the same section (or to the section root), never into itself or its own subtree. */
export function canMoveNode(nodes: TreeNode[], id: string, targetId: string | null): boolean {
  const node = nodes.find((candidate) => candidate.id === id)
  if (!node || node.parentId === targetId) return false
  if (targetId === null) return true
  const target = nodes.find((candidate) => candidate.id === targetId)
  if (target?.kind !== 'folder' || nodeCategory(target) !== nodeCategory(node)) return false
  return !collectSubtreeIds(nodes, id).has(targetId)
}

export type PlacePosition = 'before' | 'after'

/** A node can go next to any other node of the same section, except somewhere inside its own subtree. */
export function canPlaceNode(nodes: TreeNode[], id: string, targetId: string): boolean {
  const node = nodes.find((candidate) => candidate.id === id)
  const target = nodes.find((candidate) => candidate.id === targetId)
  if (!node || !target || id === targetId || nodeCategory(target) !== nodeCategory(node)) return false
  return !collectSubtreeIds(nodes, id).has(targetId)
}

/** Moves a node right before or after another one, into that node's folder. */
export function placeNode(nodes: TreeNode[], id: string, target: { id: string; position: PlacePosition }): TreeNode[] {
  const moving = nodes.find((node) => node.id === id)
  const anchor = nodes.find((node) => node.id === target.id)
  if (!moving || !anchor) return nodes
  const rest = nodes.filter((node) => node.id !== id)
  const index = rest.indexOf(anchor) + (target.position === 'after' ? 1 : 0)
  return [...rest.slice(0, index), { ...moving, parentId: anchor.parentId }, ...rest.slice(index)]
}
