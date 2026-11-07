import { KAFKA_MODES, type KafkaMode } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { ModeToolbar } from '../../request/components/ModeToolbar'
import { useConfigBinder } from '../../request/use-field-binder'
import type { EditorProps } from '../types'
import { AdminView } from './admin/AdminView'
import { BrokerBar } from './BrokerBar'
import { ConsumerView } from './ConsumerView'
import { KAFKA_COPY } from './kafka-copy'
import { ProducerView } from './ProducerView'

const VIEWS: Record<KafkaMode, (props: EditorProps) => React.ReactNode> = {
  producer: ProducerView,
  consumer: ConsumerView,
  admin: AdminView
}

/** A Kafka client: a producer that sends records, a consumer in a group, or an admin view of the cluster. */
export function KafkaEditor({ requestId }: EditorProps) {
  const mode = useConfigBinder<'kafka', KafkaMode>(requestId)('mode')
  const View = VIEWS[mode.value]
  return (
    <Column>
      <ModeToolbar requestId={requestId} modes={KAFKA_MODES} copy={KAFKA_COPY} {...mode} />
      <BrokerBar requestId={requestId} mode={mode.value} />
      <View requestId={requestId} />
    </Column>
  )
}
