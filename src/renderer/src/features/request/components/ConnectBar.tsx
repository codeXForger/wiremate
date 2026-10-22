import { Plug, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BoundField } from '../use-field-binder'
import { useRequestActions, useStreamSession } from '../use-request-actions'
import { UrlBar } from './UrlBar'

interface ConnectBarProps extends BoundField {
  requestId: string
  label: string
  placeholder?: string
  /** What to connect to, when it differs from the edited field (e.g. host plus port). */
  target?: string
}

export function ConnectBar({ requestId, target, ...field }: ConnectBarProps) {
  return <UrlBar {...field} action={<ConnectButton requestId={requestId} target={target ?? field.value} />} />
}

function ConnectButton({ requestId, target }: { requestId: string; target: string }) {
  const connected = useStreamSession(requestId)?.connected ?? false
  const actions = useRequestActions(requestId)
  const toggle = (): void => (connected ? actions.disconnect() : actions.connect(target))
  return (
    <Button variant={connected ? 'secondary' : 'primary'} onClick={toggle}>
      {connected ? <Unplug /> : <Plug />}
      {connected ? 'Disconnect' : 'Connect'}
    </Button>
  )
}
