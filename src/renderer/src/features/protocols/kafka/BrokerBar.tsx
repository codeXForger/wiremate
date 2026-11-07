import type { KafkaMode } from '@shared/types/protocol'
import { SessionButton } from '../../request/components/SessionButton'
import { UrlBar } from '../../request/components/UrlBar'
import { useFieldBinder } from '../../request/use-field-binder'
import { RefreshButton } from './admin/RefreshButton'
import { useKafkaActions } from './kafka-actions'
import { KAFKA_COPY } from './kafka-copy'

interface BrokerBarProps {
  requestId: string
  mode: KafkaMode
}

/** The bootstrap brokers, and what this mode does with them: connect, consume, or refresh the admin view. */
export function BrokerBar({ requestId, mode }: BrokerBarProps) {
  const brokers = useFieldBinder<'kafka'>(requestId)('brokers')
  const action =
    mode === 'admin' ? <RefreshButton requestId={requestId} /> : <Session requestId={requestId} mode={mode} />
  return <UrlBar label="Brokers" placeholder="host:9092,host:9093" {...brokers} action={action} />
}

function Session({ requestId, mode }: BrokerBarProps) {
  const { open, close } = useKafkaActions(requestId)
  return <SessionButton requestId={requestId} copy={KAFKA_COPY[mode]} open={open} close={close} />
}
