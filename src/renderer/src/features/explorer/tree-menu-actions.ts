import { Copy, FilePlus, FolderPlus, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import type { TreeNode } from '@shared/types/workspace'
import { duplicateAndOpen, startNewRequest } from '@/features/request/new-request'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { nodeCategory } from './tree-utils'

export interface MenuAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  className?: string
}

export function treeMenuActions(node: TreeNode, onRename: () => void): MenuAction[] {
  const parentId = node.kind === 'folder' ? node.id : node.parentId
  const category = nodeCategory(node)
  const { addFolder, removeNode } = useWorkspaceStore.getState()
  const duplicate: MenuAction[] =
    node.kind === 'request' ? [{ label: 'Duplicate', icon: Copy, onSelect: () => duplicateAndOpen(node.id) }] : []
  return [
    { label: 'New request', icon: FilePlus, onSelect: () => startNewRequest(parentId, category) },
    { label: 'New folder', icon: FolderPlus, onSelect: () => void addFolder(parentId, category) },
    ...duplicate,
    { label: 'Rename', icon: Pencil, onSelect: onRename },
    { label: 'Delete', icon: Trash2, onSelect: () => removeNode(node.id), className: 'text-destructive' }
  ]
}
