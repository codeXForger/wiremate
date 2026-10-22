import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { currentCategory, startNewRequest } from '@/features/request/new-request'

export function EmptyEditor() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm">Open a request from the sidebar, or start a new one.</p>
      <Button variant="primary" onClick={() => startNewRequest(null, currentCategory())}>
        <Plus /> New request
      </Button>
      <p className="text-xs text-muted-foreground">⌘N new request · ⌘S save · ⌘W close tab</p>
    </div>
  )
}
