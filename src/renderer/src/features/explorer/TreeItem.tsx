import type { ComponentProps } from 'react'
import { ChevronRight, Folder } from 'lucide-react'
import type { TreeNode } from '@shared/types/workspace'
import { RequestBadge } from '@/components/RequestBadge'
import { cn } from '@/lib/utils'
import { ItemName } from '@/components/ItemName'
import { RenameInput } from '@/components/RenameInput'
import { TreeItemMenu } from './TreeItemMenu'
import { TreeList } from './TreeList'
import type { DropPosition } from './drag-store'
import { dragSourceProps, rowDropProps, useDropIndicator } from './tree-drag'
import { useTreeItem, type TreeItemState } from './use-tree-item'

const INDENT_PX = 12
const ROW_CLASS = 'flex h-7 cursor-default items-center gap-1.5 pr-2 hover:bg-surface'
/** Inside a folder: highlight the row. Before or after a row: a line on that edge. */
const DROP_CLASS: Record<DropPosition, string> = {
  inside: 'bg-primary/15 outline outline-1 -outline-offset-1 outline-primary',
  before: 'shadow-[inset_0_2px_0_var(--primary)]',
  after: 'shadow-[inset_0_-2px_0_var(--primary)]'
}

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

/** Every row takes drops before or after it; folders also take drops inside, and open to show them. */
function useRowDrag(node: TreeNode, item: TreeItemState) {
  const indicator = useDropIndicator(node.id)
  const props = { ...dragSourceProps(node, !item.renaming), ...rowDropProps(node, item.expand) }
  return { props, indicator }
}

function TreeRow({ node, depth, item, ...triggerProps }: TreeRowProps) {
  const drag = useRowDrag(node, item)
  const style = { paddingLeft: 8 + depth * INDENT_PX }
  const className = cn(ROW_CLASS, item.active && 'bg-surface', drag.indicator && DROP_CLASS[drag.indicator])
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
