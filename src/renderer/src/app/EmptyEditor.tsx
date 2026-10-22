import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/ui-store'

export function EmptyEditor() {
  const openDialog = useUiStore((state) => state.openDialog)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm">Open a request from the sidebar, or start a new one.</p>
      <Button variant="primary" onClick={() => openDialog({ type: 'new-request', parentId: null })}>
        <Plus /> New request
      </Button>
      <p className="text-xs text-muted-foreground">⌘N new request · ⌘S save · ⌘W close tab</p>
    </div>
  )
}
