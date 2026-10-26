import { useState, type ReactNode } from 'react'
import { Trash2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTabStore } from '@/stores/tab-store'
import { IconButton } from './IconButton'
import { itemKeyHandler } from './item-keys'
import { ItemName } from './ItemName'
import { RenameInput, type Renameable } from './RenameInput'

interface ItemActions<T extends Renameable> {
  icon: LucideIcon
  onRename: (id: string, name: string) => void
  onDelete: (item: T) => void
  /** Extra marker after the name, e.g. which environment is active. */
  badge?: (item: T) => ReactNode
}

interface SidebarItemListProps<T extends Renameable> extends ItemActions<T> {
  label: string
  items: T[]
}

/** A sidebar list of things that open in a tab: click or Enter opens, double-click or F2 renames, hover shows delete. */
export function SidebarItemList<T extends Renameable>({ label, items, ...actions }: SidebarItemListProps<T>) {
  return (
    <ul aria-label={label} className="min-h-0 flex-1 overflow-auto p-1.5">
      {items.map((item) => (
        <SidebarItemRow key={item.id} item={item} {...actions} />
      ))}
    </ul>
  )
}

const ROW_CLASS = 'group flex h-8 cursor-default items-center gap-2 rounded-md pr-1 pl-2 text-[13px] hover:bg-surface'

function useRowProps(item: Renameable, rename: () => void) {
  const active = useTabStore((state) => state.activeId === item.id)
  const open = (): void => useTabStore.getState().open(item.id)
  return {
    'aria-label': item.name,
    tabIndex: 0,
    onClick: open,
    onDoubleClick: rename,
    onKeyDown: itemKeyHandler({ activate: open, rename }),
    className: cn(ROW_CLASS, active && 'bg-surface')
  }
}

type RowProps<T extends Renameable> = ItemActions<T> & { item: T }

function SidebarItemRow<T extends Renameable>({ item, icon: Icon, onRename, onDelete, badge }: RowProps<T>) {
  const [renaming, setRenaming] = useState(false)
  const rowProps = useRowProps(item, () => setRenaming(true))
  return (
    <li {...rowProps}>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <RowName item={item} renaming={renaming} onRename={onRename} onDone={() => setRenaming(false)} />
      {badge?.(item)}
      <DeleteButton name={item.name} onDelete={() => onDelete(item)} />
    </li>
  )
}

interface RowNameProps {
  item: Renameable
  renaming: boolean
  onRename: (id: string, name: string) => void
  onDone: () => void
}

function RowName({ item, renaming, onRename, onDone }: RowNameProps) {
  if (!renaming) return <ItemName name={item.name} />
  return <RenameInput target={item} onRename={onRename} onDone={onDone} />
}

function DeleteButton({ name, onDelete }: { name: string; onDelete: () => void }) {
  return (
    <span className="ml-auto opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
      <IconButton
        label={`Delete ${name}`}
        icon={Trash2}
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
      />
    </span>
  )
}
