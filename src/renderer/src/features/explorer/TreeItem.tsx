import type { ComponentProps } from 'react'
import { ChevronRight, Folder } from 'lucide-react'
import type { TreeNode } from '@shared/types/workspace'
import { RequestBadge } from '@/components/RequestBadge'
import { cn } from '@/lib/utils'
import { ItemName } from '@/components/ItemName'
import { RenameInput } from '@/components/RenameInput'
import { TreeItemMenu } from './TreeItemMenu'
import { TreeList } from './TreeList'
import { dragSourceProps, dropTargetProps, useIsDropTarget } from './tree-drag'
import { useTreeItem, type TreeItemState } from './use-tree-item'

const INDENT_PX = 12
const ROW_CLASS = 'flex h-7 cursor-default items-center gap-1.5 pr-2 hover:bg-surface'
const DROP_CLASS = 'bg-primary/15 outline outline-1 -outline-offset-1 outline-primary'

interface TreeItemProps {
  node: TreeNode
  depth: number
}

export function TreeItem({ node, depth }: TreeItemProps) {
  const item = useTreeItem(node)
  return (
    <>
      <TreeItemMenu node={node} onRename={item.startRename}>
        <TreeRow node={node} depth={depth} item={item} />
      </TreeItemMenu>
      {node.kind === 'folder' && item.expanded && <TreeList parentId={node.id} depth={depth + 1} />}
    </>
  )
}

type TreeRowProps = TreeItemProps & ComponentProps<'div'> & { item: TreeItemState }

/** Folders receive drops themselves; dropping on a request drops into that request's folder. */
function useRowDrag(node: TreeNode, item: TreeItemState) {
  const isFolder = node.kind === 'folder'
  const isOver = useIsDropTarget(node.id)
  const dropProps = isFolder ? dropTargetProps(node.id, item.expand) : dropTargetProps(node.parentId)
  return { props: { ...dragSourceProps(node, !item.renaming), ...dropProps }, isOver: isFolder && isOver }
}

function TreeRow({ node, depth, item, ...triggerProps }: TreeRowProps) {
  const drag = useRowDrag(node, item)
  const style = { paddingLeft: 8 + depth * INDENT_PX }
  const className = cn(ROW_CLASS, item.active && 'bg-surface', drag.isOver && DROP_CLASS)
  return (
    <div {...triggerProps} {...item.rowProps} {...drag.props} style={style} className={className}>
      <NodeIcon node={node} expanded={item.expanded} />
      {item.renaming ? <RenameInput target={node} onDone={item.stopRename} /> : <ItemName name={node.name} />}
    </div>
  )
}

function NodeIcon({ node, expanded }: { node: TreeNode; expanded: boolean }) {
  if (node.protocol) return <RequestBadge requestId={node.id} protocol={node.protocol} />
  return (
    <span className="flex w-9 shrink-0 items-center text-muted-foreground">
      <ChevronRight className={cn('size-3 transition-transform', expanded && 'rotate-90')} />
      <Folder className="size-3.5" />
    </span>
  )
}
