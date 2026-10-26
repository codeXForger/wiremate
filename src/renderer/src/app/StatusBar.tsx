import { SquareTerminal } from 'lucide-react'
import { countLevel } from '@/features/console/console-filter'
import { cn } from '@/lib/utils'
import { useConsoleStore } from '@/stores/console-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function StatusBar() {
  const workspace = useWorkspaceStore((state) => state.workspaces.find((ws) => ws.id === state.activeWorkspaceId))
  const requestCount = useWorkspaceStore((state) => Object.keys(state.requests).length)
  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t bg-panel px-3 text-[11px] text-muted-foreground">
      <span className="truncate font-mono">{workspace?.path ?? 'No workspace open'}</span>
      <span>{requestCount} requests</span>
      <span className="ml-auto">
        HTTP, TCP and UDP are live; other protocols are simulated until their clients land
      </span>
      <ConsoleToggle />
    </footer>
  )
}

function ConsoleToggle() {
  const open = useConsoleStore((state) => state.open)
  const errors = useConsoleStore((state) => countLevel(state.entries, 'error'))
  return (
    <button
      type="button"
      aria-pressed={open}
      onClick={useConsoleStore.getState().toggle}
      className={cn('flex items-center gap-1 rounded px-1.5 hover:text-foreground', open && 'text-foreground')}
    >
      <SquareTerminal className="size-3" /> Console
      {errors > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] text-white">{errors}</span>}
    </button>
  )
}
