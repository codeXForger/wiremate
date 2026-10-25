import { FolderPlus } from 'lucide-react'
import { CATEGORIES, type CategoryId } from '@shared/protocols/categories'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { SidebarHeader } from '@/components/SidebarHeader'
import { TreeList } from '@/features/explorer/TreeList'
import { rootDropProps, useDropIndicator } from '@/features/explorer/tree-drag'
import { childrenOf } from '@/features/explorer/tree-utils'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { CATEGORY_ICONS, categoryColor } from './category-icons'
import { CATEGORY_SECTIONS } from './category-sections'
import { QuickCreate } from './QuickCreate'

interface CategoryViewProps {
  category: CategoryId
}

export function CategoryView({ category }: CategoryViewProps) {
  const ExtraSection = CATEGORY_SECTIONS[category]
  return (
    <Column>
      <CategoryHeader category={category} />
      <QuickCreate category={category} />
      <Collections category={category} />
      {ExtraSection && <ExtraSection />}
    </Column>
  )
}

function CategoryHeader({ category }: CategoryViewProps) {
  const { label, description } = CATEGORIES[category]
  const Icon = CATEGORY_ICONS[category]
  return (
    <div className="flex items-start gap-2.5 border-b px-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color: categoryColor(category) }} />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{label}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function Collections({ category }: CategoryViewProps) {
  const addCollection = (): void => void useWorkspaceStore.getState().addFolder(null, category)
  return (
    <>
      <SidebarHeader title="Collections">
        <IconButton label="New collection" icon={FolderPlus} onClick={addCollection} />
      </SidebarHeader>
      <CollectionTree category={category} />
    </>
  )
}

function CollectionTree({ category }: CategoryViewProps) {
  const isEmpty = useWorkspaceStore((state) => childrenOf(state.nodes, null, category).length === 0)
  const label = `${CATEGORIES[category].label} collections`
  const className = cn('min-h-0 flex-1 overflow-auto py-1', useDropIndicator(null) !== null && 'bg-primary/5')
  return (
    <div role="tree" aria-label={label} className={className} {...rootDropProps()}>
      {isEmpty ? <Hint>No collections yet. Create one to group related requests.</Hint> : null}
      {!isEmpty && <TreeList parentId={null} depth={0} category={category} />}
    </div>
  )
}
