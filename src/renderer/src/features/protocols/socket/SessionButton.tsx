import { Plug, Unplug, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStreamSession } from '../../request/use-request-actions'
import { useSocketActions } from './socket-actions'
import type { ModeCopy } from './socket-copy'

interface SessionButtonProps {
  requestId: string
  copy: Pick<ModeCopy, 'open' | 'close'>
}

/** Opens and closes the request's socket; cancels while it is still connecting. Closing is red. */
export function SessionButton({ requestId, copy }: SessionButtonProps) {
  const session = useStreamSession(requestId)
  const { open, close } = useSocketActions(requestId)
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
