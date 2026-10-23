import { LoaderCircle, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResponseStore } from '@/stores/response-store'
import { useRequestActions } from '../use-request-actions'

export function SendButton({ requestId }: { requestId: string }) {
  const { send } = useRequestActions(requestId)
  const pending = useResponseStore((state) => state.pendingIds.includes(requestId))
  return (
    <Button variant="primary" disabled={pending} onClick={() => void send()}>
      {pending ? <LoaderCircle className="animate-spin" /> : <SendHorizontal />} Send
    </Button>
  )
}
