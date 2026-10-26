import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { formatDuration } from '@shared/utils/format'
import { Button } from '@/components/ui/button'
import { cancelHttpRequest } from '../request/send-http'

const TICK_MS = 100

/** Time since the view appeared, updated every tick while it is shown. */
function useElapsed(): number {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return now - startedAt
}

/** Shown in place of the previous response while a request is on its way. */
export function PendingResponse({ requestId }: { requestId: string }) {
  const elapsed = useElapsed()
  return (
    <div role="status" aria-label="Sending request" className="flex h-full flex-col items-center justify-center gap-3">
      <LoaderCircle aria-hidden className="size-6 animate-spin text-primary" />
      <p className="text-sm">Sending request…</p>
      <p className="font-mono text-xs text-muted-foreground tabular-nums">{formatDuration(elapsed)}</p>
      <Button size="sm" onClick={() => cancelHttpRequest(requestId)}>
        Cancel
      </Button>
    </div>
  )
}
