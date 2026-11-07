import { UrlBar } from '../../request/components/UrlBar'
import type { Bound } from '../../request/use-field-binder'
import { SessionButton } from '../../request/components/SessionButton'
import { useSocketActions } from './socket-actions'
import type { ModeCopy } from './socket-copy'
import { PortInput } from '../../request/components/SettingFields'

interface EndpointBarProps {
  requestId: string
  copy: ModeCopy
  host: Bound<string>
  port: Bound<number>
}

/** Address, port and the button that opens the socket there. */
export function EndpointBar({ requestId, copy, host, port }: EndpointBarProps) {
  const { open, close } = useSocketActions(requestId)
  const action = (
    <>
      <PortInput label={copy.port} zero="any" {...port} />
      <SessionButton requestId={requestId} copy={copy} open={open} close={close} />
    </>
  )
  return <UrlBar label={copy.host} placeholder={copy.host} {...host} action={action} />
}
