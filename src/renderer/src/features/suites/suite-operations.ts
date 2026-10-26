import type { SuiteItem } from '@shared/types/suite'
import { createId } from '@shared/utils/id'

export function appendItems(items: SuiteItem[], nodeIds: string[]): SuiteItem[] {
  return [...items, ...nodeIds.map((nodeId) => ({ id: createId('item'), nodeId }))]
}

/** Drops the removed nodes (every item that points at them) and appends the added ones; the rest keep their place. */
export function applyChanges(items: SuiteItem[], changes: { added: string[]; removed: string[] }): SuiteItem[] {
  const removed = new Set(changes.removed)
  return appendItems(
    items.filter((item) => !removed.has(item.nodeId)),
    changes.added
  )
}

export function removeItem(items: SuiteItem[], itemId: string): SuiteItem[] {
  return items.filter((item) => item.id !== itemId)
}

/** Moves the item at `from` to position `to`, as in a drag and drop. Out-of-range moves change nothing. */
export function moveItem(items: SuiteItem[], from: number, to: number): SuiteItem[] {
  const moving = items[from]
  if (!moving || to < 0 || to >= items.length || from === to) return items
  const rest = items.filter((_, index) => index !== from)
  return [...rest.slice(0, to), moving, ...rest.slice(to)]
}
