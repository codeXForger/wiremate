import type { ProtocolId } from '@shared/types/protocol'
import { wireColor } from '@/components/wire'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { protocolRegistry } from '../protocols/registry'
import type { ProtocolDefinition } from '../protocols/types'

interface NewRequestDialogProps {
  open: boolean
  parentId: string | null
  onClose: () => void
}

export function NewRequestDialog({ open, parentId, onClose }: NewRequestDialogProps) {
  const create = (protocol: ProtocolId): void => {
    useTabStore.getState().open(useWorkspaceStore.getState().addRequest(parentId, protocol))
    onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[min(640px,calc(100vw-32px))]">
        <DialogTitle>New request</DialogTitle>
        <DialogDescription>Pick what you want to talk to.</DialogDescription>
        <ProtocolGrid onPick={create} />
      </DialogContent>
    </Dialog>
  )
}

function ProtocolGrid({ onPick }: { onPick: (id: ProtocolId) => void }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {protocolRegistry.list().map((definition) => (
        <ProtocolTile key={definition.id} definition={definition} onPick={onPick} />
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
