import type { DragEvent } from 'react'
import type { TreeNode } from '@shared/types/workspace'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ROOT_TARGET, useDragStore, type DropPosition } from './drag-store'
import { canMoveNode, canPlaceNode } from './tree-utils'

export const DRAG_MIME = 'application/x-wiremate-node'

export interface DragSourceProps {
  draggable: boolean
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
}

export interface DropTargetProps {
  onDragOver: (event: DragEvent) => void
  onDragLeave: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
}

/** `id` null is the section root, which only takes drops inside it. */
interface DropTarget {
  id: string | null
  position: DropPosition
}

type ResolveTarget = (event: DragEvent) => DropTarget

export function dragSourceProps(node: TreeNode, enabled: boolean): DragSourceProps {
  return {
    draggable: enabled,
    onDragStart: (event) => {
      event.dataTransfer.setData(DRAG_MIME, node.id)
      event.dataTransfer.effectAllowed = 'move'
      useDragStore.getState().start(node.id)
    },
    onDragEnd: () => useDragStore.getState().end()
  }
}

/** The top and bottom edges of a row place before or after it; the middle of a folder drops into it. */
export function dropPosition(event: DragEvent, node: TreeNode): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5
  if (node.kind === 'request') return ratio < 0.5 ? 'before' : 'after'
  if (ratio < 0.25) return 'before'
  return ratio > 0.75 ? 'after' : 'inside'
}

function acceptsDrop({ id, position }: DropTarget): boolean {
  const { draggingId } = useDragStore.getState()
  const { nodes } = useWorkspaceStore.getState()
  if (draggingId === null) return false
  if (position === 'inside') return canMoveNode(nodes, draggingId, id)
  return id !== null && canPlaceNode(nodes, draggingId, id)
}

function completeDrop({ id, position }: DropTarget): void {
  const { draggingId, end } = useDragStore.getState()
  const store = useWorkspaceStore.getState()
  end()
  if (draggingId === null) return
  if (position === 'inside') store.moveNode(draggingId, id)
  else if (id) store.placeNode(draggingId, { id, position })
}

/** The innermost target owns the event: a rejected drop is refused, never passed on to an outer target. */
function handleDragOver(event: DragEvent, resolve: ResolveTarget): void {
  if (useDragStore.getState().draggingId === null) return
  event.stopPropagation()
  const target = resolve(event)
  const accepted = acceptsDrop(target)
  if (accepted) event.preventDefault()
  useDragStore.getState().hover(accepted ? (target.id ?? ROOT_TARGET) : null, target.position)
}

/** Moving onto a child element also fires dragleave; only clear the highlight when the pointer truly leaves. */
function handleDragLeave(event: DragEvent, key: string): void {
  const next = event.relatedTarget
  if (next instanceof Node && event.currentTarget.contains(next)) return
  if (useDragStore.getState().overTarget === key) useDragStore.getState().hover(null)
}

function handleDrop(event: DragEvent, resolve: ResolveTarget): DropTarget | null {
  event.stopPropagation()
  const target = resolve(event)
  const accepted = acceptsDrop(target)
  if (accepted) event.preventDefault()
  if (accepted) completeDrop(target)
  else useDragStore.getState().end()
  return accepted ? target : null
}

function dropProps(key: string, resolve: ResolveTarget, onDropped?: (target: DropTarget) => void): DropTargetProps {
  return {
    onDragOver: (event) => handleDragOver(event, resolve),
    onDragLeave: (event) => handleDragLeave(event, key),
    onDrop: (event) => {
      const target = handleDrop(event, resolve)
      if (target) onDropped?.(target)
    }
  }
}

/** The section root: drops land at the top level, after everything else. */
export function rootDropProps(): DropTargetProps {
  return dropProps(ROOT_TARGET, () => ({ id: null, position: 'inside' }))
}

/** A row: drops go before or after it, or into it when it is a folder. `onDroppedInside` runs after the latter. */
export function rowDropProps(node: TreeNode, onDroppedInside?: () => void): DropTargetProps {
  const resolve: ResolveTarget = (event) => ({ id: node.id, position: dropPosition(event, node) })
  return dropProps(node.id, resolve, (target) => target.position === 'inside' && onDroppedInside?.())
}

/** Where a drop over this target would land, or null when nothing is being dropped on it. */
export function useDropIndicator(targetId: string | null): DropPosition | null {
  const key = targetId ?? ROOT_TARGET
  return useDragStore((state) => (state.overTarget === key ? state.position : null))
}
