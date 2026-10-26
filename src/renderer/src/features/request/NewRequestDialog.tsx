import { CATEGORIES, categoryTerms, type CategoryId } from '@shared/protocols/categories'
import type { ProtocolId } from '@shared/types/protocol'
import { wireColor } from '@/components/wire'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { protocolRegistry } from '../protocols/registry'
import type { ProtocolDefinition } from '../protocols/types'
import { createAndOpenRequest } from './new-request'

interface NewRequestDialogProps {
  parentId: string | null
  category: CategoryId
  onClose: () => void
}

export function NewRequestDialog({ parentId, category, onClose }: NewRequestDialogProps) {
  const create = (protocol: ProtocolId): void => {
    createAndOpenRequest(parentId, protocol)
    onClose()
  }
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogTitle>{`New ${CATEGORIES[category].label} ${categoryTerms(category).item}`}</DialogTitle>
        <DialogDescription>Pick what you want to talk to.</DialogDescription>
        <ProtocolGrid category={category} onPick={create} />
      </DialogContent>
    </Dialog>
  )
}

function ProtocolGrid({ category, onPick }: { category: CategoryId; onPick: (id: ProtocolId) => void }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {CATEGORIES[category].protocols.map((id) => (
        <ProtocolTile key={id} definition={protocolRegistry.get(id)} onPick={onPick} />
      ))}
    </div>
  )
}
const TILE_CLASS =
  'flex flex-col items-start gap-1 rounded-md border border-l-2 bg-surface p-3 text-left hover:bg-border/50'

function ProtocolTile({ definition, onPick }: { definition: ProtocolDefinition; onPick: (id: ProtocolId) => void }) {
  const { id, meta, icon: Icon } = definition
  const color = wireColor(id)
  return (
    <button type="button" onClick={() => onPick(id)} className={TILE_CLASS} style={{ borderLeftColor: color }}>
      <span className="flex items-center gap-2 font-medium">
        <Icon className="size-4" style={{ color }} />
        {meta.label}
      </span>
      <span className="text-xs text-muted-foreground">{meta.description}</span>
    </button>
  )
}
