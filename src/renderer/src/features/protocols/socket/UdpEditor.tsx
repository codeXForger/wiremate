import { UDP_MODES, type UdpMode } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { FieldRow } from '../../request/components/FieldRow'
import { TextField } from '../../request/components/TextField'
import { useConfigBinder, useFieldBinder, type Bound } from '../../request/use-field-binder'
import { useRequestConfig } from '../../request/use-request'
import type { EditorProps } from '../types'
import { EndpointBar } from './EndpointBar'
import { ModeToolbar } from './ModeToolbar'
import { BROADCAST_ADDRESS, UDP_COPY } from './socket-copy'
import { NumberField } from './SocketFields'
import { SocketTabs } from './SocketTabs'
import { UdpOptions } from './UdpOptions'

/** A UDP socket that listens and sends: to one host, as a broadcast, or to a multicast group it joins. */
export function UdpEditor({ requestId }: EditorProps) {
  const mode = useUdpMode(requestId)
  return (
    <Column>
      <ModeToolbar requestId={requestId} modes={UDP_MODES} copy={UDP_COPY} {...mode} />
      {mode.value === 'multicast' ? (
        <GroupBar requestId={requestId} />
      ) : (
        <LocalBar requestId={requestId} mode={mode.value} />
      )}
      <UdpTabs requestId={requestId} mode={mode.value} />
    </Column>
  )
}

function UdpTabs({ requestId, mode }: { requestId: string; mode: UdpMode }) {
  const destination = mode === 'multicast' ? undefined : <Destination requestId={requestId} />
  const options = <UdpOptions requestId={requestId} mode={mode} />
  return <SocketTabs requestId={requestId} copy={UDP_COPY[mode]} destination={destination} options={options} />
}

/** Switching to broadcast aims at the broadcast address, unless a destination was already set. */
function useUdpMode(requestId: string): Bound<UdpMode> {
  const [config, update] = useRequestConfig<'udp'>(requestId)
  const aimAtAll = (mode: UdpMode): boolean => mode === 'broadcast' && config.host === '127.0.0.1'
  return {
    value: config.mode,
    onChange: (mode) => update({ mode, ...(aimAtAll(mode) && { host: BROADCAST_ADDRESS }) })
  }
}

function LocalBar({ requestId, mode }: { requestId: string; mode: UdpMode }) {
  const host = useFieldBinder<'udp'>(requestId)('localAddress')
  const port = useConfigBinder<'udp', number>(requestId)('localPort')
  return <EndpointBar requestId={requestId} copy={UDP_COPY[mode]} host={host} port={port} />
}

function GroupBar({ requestId }: { requestId: string }) {
  const host = useFieldBinder<'udp'>(requestId)('group')
  const port = useConfigBinder<'udp', number>(requestId)('port')
  return <EndpointBar requestId={requestId} copy={UDP_COPY.multicast} host={host} port={port} />
}

function Destination({ requestId }: { requestId: string }) {
  const host = useFieldBinder<'udp'>(requestId)('host')
  const port = useConfigBinder<'udp', number>(requestId)('port')
  return (
    <FieldRow>
      <TextField id={`${requestId}-dest-host`} label="Destination host" {...host} />
      <NumberField id={`${requestId}-dest-port`} label="Destination port" port {...port} />
    </FieldRow>
  )
}
