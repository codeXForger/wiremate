import type { ComponentProps } from 'react'
import { ChevronRight, Folder } from 'lucide-react'
import type { TreeNode } from '@shared/types/workspace'
import { ProtocolBadge } from '@/components/ProtocolBadge'
import { cn } from '@/lib/utils'
import { RenameInput } from './RenameInput'
import { TreeItemMenu } from './TreeItemMenu'
import { TreeList } from './TreeList'
import { useTreeItem, type TreeItemState } from './use-tree-item'

const INDENT_PX = 12
const ROW_CLASS = 'flex h-7 cursor-default items-center gap-1.5 pr-2 hover:bg-surface'

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

function TreeRow({ node, depth, item, ...triggerProps }: TreeRowProps) {
  const style = { paddingLeft: 8 + depth * INDENT_PX }
  return (
    <div {...triggerProps} {...item.rowProps} style={style} className={cn(ROW_CLASS, item.active && 'bg-surface')}>
      <NodeIcon node={node} expanded={item.expanded} />
      {item.renaming ? (
        <RenameInput node={node} onDone={item.stopRename} />
      ) : (
        <span className="truncate">{node.name}</span>
      )}
    </div>
  )
}

function NodeIcon({ node, expanded }: { node: TreeNode; expanded: boolean }) {
  if (node.protocol) return <ProtocolBadge protocol={node.protocol} />
  return (
    <span className="flex w-9 shrink-0 items-center text-muted-foreground">
      <ChevronRight className={cn('size-3 transition-transform', expanded && 'rotate-90')} />
      <Folder className="size-3.5" />
    </span>
  )
}
