import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { refreshAll } from './admin-actions'
import { useAdminView } from './admin-store'

/** Reloads the cluster, its topics and groups, and the open topic or group. Spins while calls are on their way. */
export function RefreshButton({ requestId }: { requestId: string }) {
  const busy = useAdminView(requestId).pending > 0
  return (
    <Button variant="primary" onClick={() => void refreshAll(requestId)}>
      <RefreshCw className={cn(busy && 'animate-spin')} /> Refresh
    </Button>
  )
}
