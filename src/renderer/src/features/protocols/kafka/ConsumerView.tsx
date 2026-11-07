import { KAFKA_START_POSITIONS } from '@shared/types/protocol'
import { Hint } from '@/components/Hint'
import { PanelTabs } from '@/components/PanelTabs'
import { FieldRow } from '../../request/components/FieldRow'
import { useRequestConfig } from '../../request/use-request'
import type { EditorProps } from '../types'
import { ConnectionPanel } from './ConnectionPanel'
import { START_LABELS } from './kafka-copy'
import { KafkaChoice, KafkaNumber, KafkaSwitch, KafkaText } from './KafkaFields'

/** What a consumer reads (topics, group, where to start) and how (commits, isolation, limits). */
export function ConsumerView({ requestId }: EditorProps) {
  const tabs = [
    { value: 'options', label: 'Options', content: <ConsumerOptions requestId={requestId} /> },
    { value: 'connection', label: 'Connection', content: <ConnectionPanel requestId={requestId} /> }
  ]
  return (
    <>
      <Subscription requestId={requestId} />
      <PanelTabs tabs={tabs} />
    </>
  )
}

const START = { field: 'startFrom', label: 'Start from', options: KAFKA_START_POSITIONS, labels: START_LABELS } as const

function Subscription({ requestId }: EditorProps) {
  const [config] = useRequestConfig<'kafka'>(requestId)
  const timed = config.startFrom === 'timestamp'
  return (
    <FieldRow>
      <KafkaText requestId={requestId} field="topic" label="Topics" placeholder="orders, payments" />
      <KafkaText requestId={requestId} field="groupId" label="Consumer group" placeholder="wiremate" />
      <KafkaChoice requestId={requestId} {...START} />
      {timed && (
        <KafkaText requestId={requestId} field="startTimestamp" label="Start time" placeholder="2026-10-26T09:30" />
      )}
    </FieldRow>
  )
}

function ConsumerOptions({ requestId }: EditorProps) {
  return (
    <div className="h-full overflow-auto">
      <FieldRow>
        <KafkaNumber requestId={requestId} field="maxMessages" label="Stop after (records)" zero="never" />
        <KafkaNumber requestId={requestId} field="sessionTimeoutMs" label="Session timeout (ms)" />
        <KafkaNumber requestId={requestId} field="maxWaitMs" label="Max fetch wait (ms)" />
      </FieldRow>
      <ConsumerSwitches requestId={requestId} />
      <Hint>
        Options apply when the consumer starts. Without commits, the group&apos;s offsets stay where they were.
      </Hint>
    </div>
  )
}

function ConsumerSwitches({ requestId }: EditorProps) {
  return (
    <FieldRow>
      <KafkaSwitch requestId={requestId} field="autoCommit" label="Commit offsets as records arrive" />
      <KafkaSwitch requestId={requestId} field="readCommitted" label="Read committed transactions only" />
    </FieldRow>
  )
}
