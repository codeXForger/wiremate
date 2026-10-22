import { FilePlus, FolderPlus, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import type { TreeNode } from '@shared/types/workspace'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export interface MenuAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  className?: string
}

export function treeMenuActions(node: TreeNode, onRename: () => void): MenuAction[] {
  const parentId = node.kind === 'folder' ? node.id : node.parentId
  const { addFolder, removeNode } = useWorkspaceStore.getState()
  const newRequest = (): void => useUiStore.getState().openDialog({ type: 'new-request', parentId })
  return [
    { label: 'New request', icon: FilePlus, onSelect: newRequest },
    { label: 'New folder', icon: FolderPlus, onSelect: () => void addFolder(parentId) },
    { label: 'Rename', icon: Pencil, onSelect: onRename },
    { label: 'Delete', icon: Trash2, onSelect: () => removeNode(node.id), className: 'text-destructive' }
  ]
}
