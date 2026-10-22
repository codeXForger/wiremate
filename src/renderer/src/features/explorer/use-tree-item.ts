import { useState, type KeyboardEvent } from 'react'
import type { TreeNode } from '@shared/types/workspace'
import { itemKeyHandler, type ItemActions } from '@/components/item-keys'
import { useTabStore } from '@/stores/tab-store'

export interface TreeRowProps {
  role: 'treeitem'
  tabIndex: number
  'aria-selected': boolean
  'aria-expanded'?: boolean
  onClick: () => void
  onDoubleClick: () => void
  onKeyDown: (event: KeyboardEvent) => void
}

export function treeRowProps(
  node: TreeNode,
  state: { active: boolean; expanded: boolean },
  actions: ItemActions
): TreeRowProps {
  return {
    role: 'treeitem',
    tabIndex: 0,
    'aria-selected': state.active,
    'aria-expanded': node.kind === 'folder' ? state.expanded : undefined,
    onClick: actions.activate,
    onDoubleClick: actions.rename,
    onKeyDown: itemKeyHandler(actions)
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
  const startRename = (): void => setRenaming(true)
  const rowProps = treeRowProps(node, { active, expanded }, { activate, rename: startRename })
  const controls = {
    startRename,
    stopRename: () => setRenaming(false),
    expand: () => setExpanded(true)
  }
  return { expanded, renaming, active, rowProps, ...controls }
}
