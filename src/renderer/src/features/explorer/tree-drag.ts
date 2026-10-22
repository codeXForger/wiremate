import type { DragEvent } from 'react'
import type { TreeNode } from '@shared/types/workspace'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ROOT_TARGET, useDragStore } from './drag-store'
import { canMoveNode } from './tree-utils'

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

function acceptsDrop(targetId: string | null): boolean {
  const { draggingId } = useDragStore.getState()
  return draggingId !== null && canMoveNode(useWorkspaceStore.getState().nodes, draggingId, targetId)
}

function completeDrop(targetId: string | null): void {
  const { draggingId, end } = useDragStore.getState()
  if (draggingId) useWorkspaceStore.getState().moveNode(draggingId, targetId)
  end()
}

/** The innermost target owns the event: a rejected drop is refused, never passed on to an outer target. */
function handleDragOver(event: DragEvent, targetId: string | null): void {
  if (useDragStore.getState().draggingId === null) return
  event.stopPropagation()
  const accepted = acceptsDrop(targetId)
  if (accepted) event.preventDefault()
  useDragStore.getState().hover(accepted ? (targetId ?? ROOT_TARGET) : null)
}

/** Moving onto a child element also fires dragleave; only clear the highlight when the pointer truly leaves. */
function handleDragLeave(event: DragEvent, key: string): void {
  const next = event.relatedTarget
  if (next instanceof Node && event.currentTarget.contains(next)) return
  if (useDragStore.getState().overTarget === key) useDragStore.getState().hover(null)
}

function handleDrop(event: DragEvent, targetId: string | null): boolean {
  event.stopPropagation()
  const accepted = acceptsDrop(targetId)
  if (accepted) event.preventDefault()
  if (accepted) completeDrop(targetId)
  else useDragStore.getState().end()
  return accepted
}

/**
 * `targetId` is the folder that receives the drop; null means the section root.
 * `onDropped` runs after a successful move (e.g. to expand the folder).
 */
export function dropTargetProps(targetId: string | null, onDropped?: () => void): DropTargetProps {
  const key = targetId ?? ROOT_TARGET
  return {
    onDragOver: (event) => handleDragOver(event, targetId),
    onDragLeave: (event) => handleDragLeave(event, key),
    onDrop: (event) => handleDrop(event, targetId) && onDropped?.()
  }
}

export function useIsDropTarget(targetId: string | null): boolean {
  const key = targetId ?? ROOT_TARGET
  return useDragStore((state) => state.overTarget === key)
}
