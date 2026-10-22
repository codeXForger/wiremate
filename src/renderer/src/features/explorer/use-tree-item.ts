import { useState, type KeyboardEvent } from 'react'
import type { TreeNode } from '@shared/types/workspace'
import { useTabStore } from '@/stores/tab-store'

export interface TreeRowProps {
  role: 'treeitem'
  tabIndex: number
  'aria-selected': boolean
  'aria-expanded'?: boolean
  onClick: () => void
  onKeyDown: (event: KeyboardEvent) => void
}

export function treeRowProps(
  node: TreeNode,
  state: { active: boolean; expanded: boolean },
  activate: () => void
): TreeRowProps {
  return {
    role: 'treeitem',
    tabIndex: 0,
    'aria-selected': state.active,
    'aria-expanded': node.kind === 'folder' ? state.expanded : undefined,
    onClick: activate,
    onKeyDown: (event) => event.key === 'Enter' && activate()
  }
}

export interface TreeItemState {
  expanded: boolean
  renaming: boolean
  active: boolean
  rowProps: TreeRowProps
  startRename: () => void
  stopRename: () => void
  expand: () => void
}

export function useTreeItem(node: TreeNode): TreeItemState {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const active = useTabStore((state) => state.activeId === node.id)
  const activate = (): void => (node.kind === 'folder' ? setExpanded(!expanded) : useTabStore.getState().open(node.id))
  const rowProps = treeRowProps(node, { active, expanded }, activate)
  const controls = {
    startRename: () => setRenaming(true),
    stopRename: () => setRenaming(false),
    expand: () => setExpanded(true)
  }
  return { expanded, renaming, active, rowProps, ...controls }
}
