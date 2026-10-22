import { useWorkspaceStore } from '@/stores/workspace-store'

export function StatusBar() {
  const workspace = useWorkspaceStore((state) => state.workspaces.find((ws) => ws.id === state.activeWorkspaceId))
  const requestCount = useWorkspaceStore((state) => Object.keys(state.requests).length)
  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t bg-panel px-3 text-[11px] text-muted-foreground">
      <span className="truncate font-mono">{workspace?.path ?? 'No workspace open'}</span>
      <span>{requestCount} requests</span>
      <span className="ml-auto">Responses are simulated until protocol clients land</span>
    </footer>
  )
}
