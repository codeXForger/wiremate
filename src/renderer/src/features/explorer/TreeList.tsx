import { useShallow } from 'zustand/react/shallow'
import type { CategoryId } from '@shared/protocols/categories'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { TreeItem } from './TreeItem'
import { childrenOf } from './tree-utils'

interface TreeListProps {
  parentId: string | null
  depth: number
  /** Filters the top level to one category; nested levels inherit their parent's. */
  category?: CategoryId
}

export function TreeList({ parentId, depth, category }: TreeListProps) {
  const children = useWorkspaceStore(useShallow((state) => childrenOf(state.nodes, parentId, category)))
  return (
    <>
      {children.map((node) => (
        <TreeItem key={node.id} node={node} depth={depth} />
      ))}
    </>
  )
}
