import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRequestActions } from '../use-request-actions'

export function SendButton({ requestId }: { requestId: string }) {
  const { send } = useRequestActions(requestId)
  return (
    <Button variant="primary" onClick={send}>
      <SendHorizontal /> Send
    </Button>
  )
}
