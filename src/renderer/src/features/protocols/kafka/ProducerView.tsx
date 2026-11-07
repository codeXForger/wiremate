import { SendHorizontal } from 'lucide-react'
import { KAFKA_ACKS, KAFKA_COMPRESSIONS, type KeyValue } from '@shared/types/protocol'
import { Hint } from '@/components/Hint'
import { PanelTabs } from '@/components/PanelTabs'
import { Button } from '@/components/ui/button'
import { FieldRow } from '../../request/components/FieldRow'
import { KeyValueTable } from '../../request/components/KeyValueTable'
import { MessageComposer } from '../../request/components/MessageComposer'
import { useConfigBinder, useFieldBinder } from '../../request/use-field-binder'
import { useStreamSession } from '../../request/use-request-actions'
import type { EditorProps } from '../types'
import { ConnectionPanel } from './ConnectionPanel'
import { useKafkaActions } from './kafka-actions'
import { ACKS_LABELS } from './kafka-copy'
import { KafkaChoice, KafkaSwitch, KafkaText } from './KafkaFields'

/** What a producer sends (topic, partition, key, value, headers) and how (acks, compression, idempotence). */
export function ProducerView({ requestId }: EditorProps) {
  const headers = useConfigBinder<'kafka', KeyValue[]>(requestId)('headers')
  const count = headers.value.filter((row) => row.enabled && row.key !== '').length
  const tabs = [
    { value: 'record', label: 'Record', className: 'flex flex-col', content: <RecordEditor requestId={requestId} /> },
    {
      value: 'headers',
      label: count > 0 ? `Headers (${count})` : 'Headers',
      content: <KeyValueTable label="Header" {...headers} />
    },
    { value: 'options', label: 'Options', content: <ProducerOptions requestId={requestId} /> },
    { value: 'connection', label: 'Connection', content: <ConnectionPanel requestId={requestId} /> }
  ]
  return <PanelTabs tabs={tabs} />
}

function RecordEditor({ requestId }: EditorProps) {
  const value = useFieldBinder<'kafka'>(requestId)('value')
  const footer = <ProduceBar requestId={requestId} />
  return (
    <>
      <FieldRow>
        <KafkaText requestId={requestId} field="topic" label="Topic" placeholder="orders" />
        <KafkaText requestId={requestId} field="partition" label="Partition" placeholder="Partitioner decides" />
        <KafkaText requestId={requestId} field="key" label="Key" placeholder="No key" />
      </FieldRow>
      <MessageComposer requestId={requestId} label="Value" language="plaintext" footer={footer} {...value} />
    </>
  )
}

function ProduceBar({ requestId }: EditorProps) {
  const live = useStreamSession(requestId)?.connected ?? false
  const { produce } = useKafkaActions(requestId)
  return (
    <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
      {!live && <span className="text-xs text-muted-foreground">Connect the producer to send</span>}
      <Button size="sm" variant="primary" disabled={!live} onClick={produce}>
        <SendHorizontal /> Send
      </Button>
    </div>
  )
}

function ProducerOptions({ requestId }: EditorProps) {
  return (
    <div className="h-full overflow-auto">
      <FieldRow>
        <KafkaChoice requestId={requestId} field="acks" label="Acks" options={KAFKA_ACKS} labels={ACKS_LABELS} />
        <KafkaChoice requestId={requestId} field="compression" label="Compression" options={KAFKA_COMPRESSIONS} />
        <KafkaSwitch requestId={requestId} field="idempotent" label="Idempotent" />
      </FieldRow>
      <Hint>Options apply when the producer connects. Idempotence needs acks from all in-sync replicas.</Hint>
    </div>
  )
}
