import type { TcpMode } from '@shared/types/protocol'
import { FieldRow } from '../../request/components/FieldRow'
import { OptionsPanel } from './OptionsPanel'
import { NumberField, SwitchField } from './SocketFields'
import { useOptionsBinder } from './use-options-binder'

interface TcpOptionsProps {
  requestId: string
  mode: TcpMode
}

/** Socket options, applied when the client connects or the server accepts a client. */
export function TcpOptions({ requestId, mode }: TcpOptionsProps) {
  const flag = useOptionsBinder<'tcp', boolean>(requestId)
  return (
    <OptionsPanel hint="A read larger than the receive buffer shows as several messages.">
      <TcpLimits requestId={requestId} mode={mode} />
      <FieldRow>
        <SwitchField id={`${requestId}-nodelay`} label="No delay (TCP_NODELAY)" {...flag('noDelay')} />
        <SwitchField id={`${requestId}-keepalive`} label="Keep-alive (SO_KEEPALIVE)" {...flag('keepAlive')} />
      </FieldRow>
    </OptionsPanel>
  )
}

/** A client limits how long it waits to connect; a server, how many clients it takes. */
function ModeLimit({ requestId, mode }: TcpOptionsProps) {
  const number = useOptionsBinder<'tcp', number>(requestId)
  if (mode === 'server') {
    return <NumberField id={`${requestId}-max`} label="Max connections" zero="no limit" {...number('maxConnections')} />
  }
  const timeout = number('connectTimeoutMs')
  return <NumberField id={`${requestId}-connect`} label="Connect timeout (ms)" zero="none" {...timeout} />
}

function TcpLimits({ requestId, mode }: TcpOptionsProps) {
  const number = useOptionsBinder<'tcp', number>(requestId)
  const id = (key: string): string => `${requestId}-${key}`
  return (
    <FieldRow>
      <ModeLimit requestId={requestId} mode={mode} />
      <NumberField id={id('idle')} label="Idle timeout (ms)" zero="never" {...number('idleTimeoutMs')} />
      <NumberField id={id('buffer')} label="Receive buffer (bytes)" zero="whole reads" {...number('bufferSize')} />
      <NumberField id={id('delay')} label="Keep-alive delay (ms)" {...number('keepAliveDelayMs')} />
    </FieldRow>
  )
}
