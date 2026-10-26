import { TCP_MODES, type TcpMode } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { useConfigBinder, useFieldBinder } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { EndpointBar } from './EndpointBar'
import { ModeToolbar } from './ModeToolbar'
import { TCP_COPY } from './socket-copy'
import { SocketTabs } from './SocketTabs'
import { TcpOptions } from './TcpOptions'

/** A TCP client that connects to a server, or a server that clients connect to. */
export function TcpEditor({ requestId }: EditorProps) {
  const mode = useConfigBinder<'tcp', TcpMode>(requestId)('mode')
  const copy = TCP_COPY[mode.value]
  const host = useFieldBinder<'tcp'>(requestId)('host')
  const port = useConfigBinder<'tcp', number>(requestId)('port')
  return (
    <Column>
      <ModeToolbar requestId={requestId} modes={TCP_MODES} copy={TCP_COPY} {...mode} />
      <EndpointBar requestId={requestId} copy={copy} host={host} port={port} />
      <SocketTabs requestId={requestId} copy={copy} options={<TcpOptions requestId={requestId} mode={mode.value} />} />
    </Column>
  )
}
