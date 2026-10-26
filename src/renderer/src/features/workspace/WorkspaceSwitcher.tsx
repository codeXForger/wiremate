import { Check, ChevronDown, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useUiStore } from '@/stores/ui-store'
import { saveQueue } from '@/stores/workspace-persistence'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function WorkspaceSwitcher() {
  const active = useWorkspaceStore((state) => state.workspaces.find((ws) => ws.id === state.activeWorkspaceId))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Switch workspace">
          {active?.name ?? 'No workspace'} <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <WorkspaceMenu />
    </DropdownMenu>
  )
}

function WorkspaceMenu() {
  const create = (): void => useUiStore.getState().openDialog({ type: 'create-workspace' })
  return (
    <DropdownMenuContent align="start">
      <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
      <WorkspaceItems />
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={create}>
        <FolderPlus /> New workspace…
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

function WorkspaceItems() {
  const { workspaces, activeWorkspaceId, openWorkspace } = useWorkspaceStore()
  return workspaces.map((ws) => (
    <DropdownMenuItem key={ws.id} onSelect={() => void saveQueue.flush().then(() => openWorkspace(ws.id))}>
      {ws.id === activeWorkspaceId ? <Check /> : <span className="w-3.5" />} {ws.name}
    </DropdownMenuItem>
  ))
}
