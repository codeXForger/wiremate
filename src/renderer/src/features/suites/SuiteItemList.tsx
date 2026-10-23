import { useState, type DragEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import type { SuiteItem } from '@shared/types/suite'
import { IconButton } from '@/components/IconButton'
import { ItemName } from '@/components/ItemName'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { KindIcon } from './KindIcon'
import { describeItem, type ItemView } from './suite-items'
import { moveItem, removeItem } from './suite-operations'

export type SetItems = (items: SuiteItem[]) => void

interface ListProps {
  items: SuiteItem[]
  setItems: SetItems
}

interface RowProps extends ListProps {
  index: number
  dragging: number | null
  setDragging: (index: number | null) => void
}

export function SuiteItemList(props: ListProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  return (
    <ol aria-label="Suite requests" className="flex flex-col p-1.5">
      {props.items.map((item, index) => (
        <ItemRow key={item.id} {...props} index={index} dragging={dragging} setDragging={setDragging} />
      ))}
    </ol>
  )
}

/** Native drag and drop: drop an item on another row to take its place. */
function dragProps({ items, setItems, index, dragging, setDragging }: RowProps) {
  const onDrop = (event: DragEvent): void => {
    event.preventDefault()
    if (dragging !== null) setItems(moveItem(items, dragging, index))
    setDragging(null)
  }
  return {
    draggable: true,
    onDragStart: () => setDragging(index),
    onDragOver: (event: DragEvent) => event.preventDefault(),
    onDrop,
    onDragEnd: () => setDragging(null)
  }
}

const ROW_CLASS = 'group flex h-9 items-center gap-2 rounded-md px-1.5 text-[13px] hover:bg-surface'

function useItemView(item: SuiteItem): ItemView {
  const nodes = useWorkspaceStore((state) => state.nodes)
  const requests = useWorkspaceStore((state) => state.requests)
  return describeItem(item, { nodes, requests })
}

function ItemRow(props: RowProps) {
  const item = props.items[props.index] as SuiteItem
  const view = useItemView(item)
  const className = cn(ROW_CLASS, props.dragging === props.index && 'opacity-50')
  return (
    <li aria-label={`${props.index + 1}. ${view.name}`} {...dragProps(props)} className={className}>
      <GripVertical aria-hidden className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />
      <span className="w-5 text-right font-mono text-[11px] text-muted-foreground">{props.index + 1}</span>
      <KindIcon kind={view.kind} />
      <ItemName name={view.name} />
      <ItemDetail view={view} />
      <ItemActions {...props} item={item} name={view.name} />
    </li>
  )
}

function ItemDetail({ view }: { view: ItemView }) {
  const tone = view.kind === 'missing' ? 'text-destructive' : 'text-muted-foreground'
  return <span className={cn('min-w-0 truncate font-mono text-[11px]', tone)}>{view.detail}</span>
}

function ItemActions({ item, index, items, setItems, name }: RowProps & { item: SuiteItem; name: string }) {
  const move = (to: number) => () => setItems(moveItem(items, index, to))
  return (
    <span className="ml-auto flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
      <IconButton label={`Move ${name} up`} icon={ArrowUp} disabled={index === 0} onClick={move(index - 1)} />
      <IconButton
        label={`Move ${name} down`}
        icon={ArrowDown}
        disabled={index === items.length - 1}
        onClick={move(index + 1)}
      />
      <IconButton label={`Remove ${name}`} icon={Trash2} onClick={() => setItems(removeItem(items, item.id))} />
    </span>
  )
}
