import { LoaderCircle, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResponseStore } from '@/stores/response-store'
import { cancelHttpRequest } from '../send-http'
import { useRequestActions } from '../use-request-actions'

/** Send, or Cancel while the request is on its way. */
export function SendButton({ requestId }: { requestId: string }) {
  const { send } = useRequestActions(requestId)
  const pending = useResponseStore((state) => state.pendingIds.includes(requestId))
  if (pending) return <CancelButton requestId={requestId} />
  return (
    <Button variant="primary" onClick={() => void send()}>
      <SendHorizontal /> Send
    </Button>
  )
}

function CancelButton({ requestId }: { requestId: string }) {
  return (
    <Button onClick={() => cancelHttpRequest(requestId)}>
      <LoaderCircle className="animate-spin" /> Cancel
    </Button>
  )
}
