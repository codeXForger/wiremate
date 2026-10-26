import type { UdpMode } from '@shared/types/protocol'
import { FieldRow } from '../../request/components/FieldRow'
import { TextField } from '../../request/components/TextField'
import { OptionsPanel } from './OptionsPanel'
import { NumberField, SwitchField } from './SocketFields'
import { useOptionsBinder } from './use-options-binder'

interface UdpOptionsProps {
  requestId: string
  mode: UdpMode
}

/** Socket options, applied when the socket binds. */
export function UdpOptions({ requestId, mode }: UdpOptionsProps) {
  return (
    <OptionsPanel hint="Reuse address lets several listeners share a port, e.g. members of one group.">
      <UdpSizes requestId={requestId} mode={mode} />
      <UdpFlags requestId={requestId} mode={mode} />
    </OptionsPanel>
  )
}

function UdpSizes({ requestId, mode }: UdpOptionsProps) {
  const number = useOptionsBinder<'udp', number>(requestId)
  const id = (key: string): string => `${requestId}-${key}`
  const multicast = mode === 'multicast'
  return (
    <FieldRow>
      <NumberField id={id('ttl')} label={multicast ? 'Multicast TTL' : 'TTL'} max={255} {...number('ttl')} />
      <NumberField id={id('rcvbuf')} label="Receive buffer (SO_RCVBUF)" zero="system" {...number('recvBufferSize')} />
      <NumberField id={id('sndbuf')} label="Send buffer (SO_SNDBUF)" zero="system" {...number('sendBufferSize')} />
      {multicast && <MulticastInterface requestId={requestId} />}
    </FieldRow>
  )
}

function UdpFlags({ requestId, mode }: UdpOptionsProps) {
  const flag = useOptionsBinder<'udp', boolean>(requestId)
  const id = (key: string): string => `${requestId}-${key}`
  return (
    <FieldRow>
      <SwitchField id={id('ipv6')} label="IPv6 (udp6)" {...flag('ipv6')} />
      <SwitchField id={id('reuse')} label="Reuse address" {...flag('reuseAddr')} />
      {mode === 'multicast' && (
        <SwitchField id={id('loop')} label="Multicast loopback" {...flag('multicastLoopback')} />
      )}
    </FieldRow>
  )
}

function MulticastInterface({ requestId }: { requestId: string }) {
  const field = useOptionsBinder<'udp', string>(requestId)('multicastInterface')
  return <TextField id={`${requestId}-iface`} label="Multicast interface" placeholder="any" {...field} />
}
