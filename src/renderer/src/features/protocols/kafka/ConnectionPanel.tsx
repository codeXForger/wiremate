import { KAFKA_AUTH_MECHANISMS } from '@shared/types/protocol'
import { Hint } from '@/components/Hint'
import { FieldRow } from '../../request/components/FieldRow'
import { useRequestConfig } from '../../request/use-request'
import { AUTH_LABELS } from './kafka-copy'
import { KafkaChoice, KafkaSwitch, KafkaText } from './KafkaFields'

/** Who the client says it is, and how it signs in: SASL and TLS. */
export function ConnectionPanel({ requestId }: { requestId: string }) {
  const [config] = useRequestConfig<'kafka'>(requestId)
  return (
    <div className="h-full overflow-auto">
      <Identity requestId={requestId} />
      {config.auth !== 'none' && <Credentials requestId={requestId} />}
      <Hint>Applies when the client connects. Keep secrets in environment variables, e.g. {'{{password}}'}.</Hint>
    </div>
  )
}

function Identity({ requestId }: { requestId: string }) {
  const auth = { field: 'auth', label: 'Authentication', options: KAFKA_AUTH_MECHANISMS, labels: AUTH_LABELS } as const
  return (
    <FieldRow>
      <KafkaText requestId={requestId} field="clientId" label="Client ID" placeholder="wiremate" />
      <KafkaChoice requestId={requestId} {...auth} />
      <KafkaSwitch requestId={requestId} field="ssl" label="TLS" />
    </FieldRow>
  )
}

function Credentials({ requestId }: { requestId: string }) {
  return (
    <FieldRow>
      <KafkaText requestId={requestId} field="username" label="Username" />
      <KafkaText requestId={requestId} field="password" label="Password" type="password" />
    </FieldRow>
  )
}
