import { Plug, Unplug, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStreamSession } from '../use-request-actions'

interface SessionButtonProps {
  requestId: string
  /** The button's words: "Connect" and "Disconnect", "Listen" and "Stop"… */
  copy: { open: string; close: string }
  open: () => void
  close: () => void
}

/** Opens and closes the request's live session (a socket, a Kafka client); cancels while it is still opening. */
export function SessionButton({ requestId, copy, open, close }: SessionButtonProps) {
  const session = useStreamSession(requestId)
  if (session?.connecting) return <CancelButton onClick={close} />
  return <ToggleButton live={session?.connected ?? false} copy={copy} onOpen={open} onClose={close} />
}

interface ToggleButtonProps {
  live: boolean
  copy: SessionButtonProps['copy']
  onOpen: () => void
  onClose: () => void
}

function ToggleButton({ live, copy, onOpen, onClose }: ToggleButtonProps) {
  return (
    <Button variant={live ? 'destructive' : 'primary'} onClick={live ? onClose : onOpen}>
      {live ? <Unplug /> : <Plug />}
      {live ? copy.close : copy.open}
    </Button>
  )
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="destructive" onClick={onClick}>
      <X /> Cancel
    </Button>
  )
}
