import { useState, type KeyboardEvent } from 'react'
import type { TreeNode } from '@shared/types/workspace'
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

export interface RowHandlers {
  activate: () => void
  rename: () => void
}

const KEY_ACTIONS: Record<string, keyof RowHandlers> = { Enter: 'activate', F2: 'rename' }

function rowKeyHandler(handlers: RowHandlers): (event: KeyboardEvent) => void {
  return (event) => {
    const action = KEY_ACTIONS[event.key]
    if (action) handlers[action]()
  }
}

export function treeRowProps(
  node: TreeNode,
  state: { active: boolean; expanded: boolean },
  handlers: RowHandlers
): TreeRowProps {
  return {
    role: 'treeitem',
    tabIndex: 0,
    'aria-selected': state.active,
    'aria-expanded': node.kind === 'folder' ? state.expanded : undefined,
    onClick: handlers.activate,
    onDoubleClick: handlers.rename,
    onKeyDown: rowKeyHandler(handlers)
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
