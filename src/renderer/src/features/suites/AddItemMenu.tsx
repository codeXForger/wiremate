import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { KindIcon } from './KindIcon'
import { addableNodes } from './suite-items'

interface AddItemMenuProps {
  onAdd: (nodeId: string) => void
}

export function AddItemMenu({ onAdd }: AddItemMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus /> Add request or folder
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-auto">
        <AddableEntries onAdd={onAdd} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AddableEntries({ onAdd }: AddItemMenuProps) {
  const nodes = useWorkspaceStore((state) => state.nodes)
  const entries = addableNodes(nodes)
  if (entries.length === 0) return <DropdownMenuItem disabled>The API section has no requests yet</DropdownMenuItem>
  return entries.map(({ node, depth }) => (
    <DropdownMenuItem key={node.id} onSelect={() => onAdd(node.id)} style={{ paddingLeft: 8 + depth * 14 }}>
      <KindIcon kind={node.kind} /> {node.name}
    </DropdownMenuItem>
  ))
}
