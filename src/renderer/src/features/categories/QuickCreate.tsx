import { Plus } from 'lucide-react'
import { CATEGORIES, type CategoryId } from '@shared/protocols/categories'
import { wireColor } from '@/components/wire'
import { protocolRegistry } from '../protocols/registry'
import type { ProtocolDefinition } from '../protocols/types'
import { createAndOpenRequest } from '../request/new-request'

const ITEM_CLASS = 'group flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-surface'

/** The category's own menu: one entry per protocol it contains. */
export function QuickCreate({ category }: { category: CategoryId }) {
  return (
    <nav aria-label={`New ${CATEGORIES[category].label} request`} className="flex flex-col gap-0.5 border-b p-1.5">
      {CATEGORIES[category].protocols.map((id) => (
        <QuickCreateItem key={id} definition={protocolRegistry.get(id)} />
      ))}
    </nav>
  )
}

function QuickCreateItem({ definition }: { definition: ProtocolDefinition }) {
  const { id, meta, icon: Icon } = definition
  return (
    <button type="button" className={ITEM_CLASS} onClick={() => createAndOpenRequest(null, id)}>
      <Icon className="size-3.5 shrink-0" style={{ color: wireColor(id) }} />
      <span className="flex-1 truncate">New {meta.label} request</span>
      <Plus className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </button>
  )
}
