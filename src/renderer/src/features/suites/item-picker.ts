import type { TreeNode } from '@shared/types/workspace'
import { collectSubtreeIds } from '../explorer/tree-utils'
import { addableNodes, type AddableNode } from './suite-items'

function ancestorIds(nodes: TreeNode[], id: string): string[] {
  const parent = nodes.find((node) => node.id === id)?.parentId
  return parent ? [parent, ...ancestorIds(nodes, parent)] : []
}

/**
 * The API tree for the picker, narrowed by a search: what matches, the folders leading to it (so you can see where
 * it is), and everything inside a matching folder.
 */
export function pickerRows(nodes: TreeNode[], query: string): AddableNode[] {
  const rows = addableNodes(nodes)
  const needle = query.trim().toLowerCase()
  if (needle === '') return rows
  const visible = new Set<string>()
  rows
    .filter(({ node }) => node.name.toLowerCase().includes(needle))
    .forEach(({ node }) => {
      ancestorIds(nodes, node.id).forEach((id) => visible.add(id))
      collectSubtreeIds(nodes, node.id).forEach((id) => visible.add(id))
    })
  return rows.filter(({ node }) => visible.has(node.id))
}

/** A node is already covered when one of its folders is selected: running the folder runs it. */
export function isCovered(nodes: TreeNode[], selected: Set<string>, id: string): boolean {
  return ancestorIds(nodes, id).some((ancestor) => selected.has(ancestor))
}

/** Toggles a node. Selecting a folder drops the selections inside it, which the folder now covers. */
export function toggleSelection(nodes: TreeNode[], selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.delete(id)) return next
  collectSubtreeIds(nodes, id).forEach((inside) => next.delete(inside))
  return next.add(id)
}

/** What to add, in tree order, leaving out anything a selected folder already covers. */
export function selectionInOrder(nodes: TreeNode[], selected: Set<string>): string[] {
  return addableNodes(nodes)
    .map(({ node }) => node.id)
    .filter((id) => selected.has(id) && !isCovered(nodes, selected, id))
}

export interface PickerChanges {
  /** Newly ticked, in tree order. */
  added: string[]
  /** Unticked (or now covered by a ticked folder) since the picker opened. */
  removed: string[]
}

/** What saving the picker changes in the suite. Items that are not in the tree (deleted) are never touched. */
export function pickerChanges(nodes: TreeNode[], initial: Set<string>, selected: Set<string>): PickerChanges {
  const chosen = selectionInOrder(nodes, selected)
  const kept = new Set(chosen)
  const pickable = new Set(addableNodes(nodes).map(({ node }) => node.id))
  return {
    added: chosen.filter((id) => !initial.has(id)),
    removed: [...initial].filter((id) => pickable.has(id) && !kept.has(id))
  }
}
