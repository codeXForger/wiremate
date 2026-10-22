import type { KeyValue } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { PanelTabs, type PanelTab } from '@/components/PanelTabs'
import { ConnectBar } from '../../request/components/ConnectBar'
import { KeyValueTable } from '../../request/components/KeyValueTable'
import { MessageComposer } from '../../request/components/MessageComposer'
import { useConfigBinder, useFieldBinder } from '../../request/use-field-binder'
import type { EditorProps } from '../types'

export function WebSocketEditor({ requestId }: EditorProps) {
  const bind = useFieldBinder<'websocket'>(requestId)
  const rows = useConfigBinder<'websocket', KeyValue[]>(requestId)
  const message = <MessageComposer requestId={requestId} {...bind('message')} />
  const tabs: PanelTab[] = [
    { value: 'message', label: 'Message', className: 'flex flex-col', content: message },
    { value: 'headers', label: 'Headers', content: <KeyValueTable label="Header" {...rows('headers')} /> }
  ]
  return (
    <Column>
      <ConnectBar requestId={requestId} label="WebSocket URL" placeholder="wss://" {...bind('url')} />
      <PanelTabs tabs={tabs} />
    </Column>
  )
}
