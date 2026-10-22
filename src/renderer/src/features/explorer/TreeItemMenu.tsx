import { useRef, type ReactNode } from 'react'
import type { TreeNode } from '@shared/types/workspace'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { treeMenuActions } from './tree-menu-actions'

interface TreeItemMenuProps {
  node: TreeNode
  onRename: () => void
  children: ReactNode
}

/** Rename starts only after the menu has closed, so the menu's focus trap cannot blur the input. */
function useDeferredRename(onRename: () => void) {
  const requested = useRef(false)
  const request = (): void => {
    requested.current = true
  }
  const onCloseAutoFocus = (event: Event): void => {
    event.preventDefault()
    if (requested.current) onRename()
    requested.current = false
  }
  return { request, onCloseAutoFocus }
}

export function TreeItemMenu({ node, onRename, children }: TreeItemMenuProps) {
  const rename = useDeferredRename(onRename)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={rename.onCloseAutoFocus}>
        {treeMenuActions(node, rename.request).map(({ label, icon: Icon, onSelect, className }) => (
          <ContextMenuItem key={label} onSelect={onSelect} className={className}>
            <Icon /> {label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}
