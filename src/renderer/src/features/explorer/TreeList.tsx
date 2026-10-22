import { useShallow } from 'zustand/react/shallow'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { TreeItem } from './TreeItem'
import { childrenOf } from './tree-utils'

interface TreeListProps {
  parentId: string | null
  depth: number
}

export function TreeList({ parentId, depth }: TreeListProps) {
  const children = useWorkspaceStore(useShallow((state) => childrenOf(state.nodes, parentId)))
  return (
    <>
      {children.map((node) => (
        <TreeItem key={node.id} node={node} depth={depth} />
      ))}
    </>
  )
}
