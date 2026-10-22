import type { ComponentType } from 'react'
import type { ProtocolConfigMap, ProtocolId } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { ConnectBar } from '../../request/components/ConnectBar'
import { FieldRow } from '../../request/components/FieldRow'
import { MessageComposer } from '../../request/components/MessageComposer'
import { TextField } from '../../request/components/TextField'
import { useFieldBinder, type ConfigBinder, type KeysOfType } from '../../request/use-field-binder'
import type { EditorProps } from '../types'

export interface FieldSpec<P extends ProtocolId> {
  key: KeysOfType<ProtocolConfigMap[P], string>
  label: string
  placeholder?: string
}

/** Declarative layout for connection-oriented protocols: a target, a row of fields, and a message. */
export interface StreamFormSpec<P extends ProtocolId> {
  target: FieldSpec<P>
  fields: FieldSpec<P>[]
  message: FieldSpec<P> & { language?: string }
  /** Protocol-specific controls rendered after the text fields (e.g. MQTT QoS). */
  extras?: ComponentType<EditorProps>
}

interface StreamFormEditorProps<P extends ProtocolId> extends EditorProps {
  spec: StreamFormSpec<P>
}

export function StreamFormEditor<P extends ProtocolId>({ requestId, spec }: StreamFormEditorProps<P>) {
  const bind = useFieldBinder<P>(requestId)
  const { target, fields, message } = spec
  return (
    <Column>
      <ConnectBar requestId={requestId} label={target.label} placeholder={target.placeholder} {...bind(target.key)} />
      <SpecFields requestId={requestId} fields={fields} bind={bind} extras={spec.extras} />
      <MessageComposer requestId={requestId} label={message.label} language={message.language} {...bind(message.key)} />
    </Column>
  )
}

interface SpecFieldsProps<P extends ProtocolId> {
  requestId: string
  fields: FieldSpec<P>[]
  bind: ConfigBinder<P, string>
  extras?: ComponentType<EditorProps>
}

function SpecFields<P extends ProtocolId>({ requestId, fields, bind, extras: Extras }: SpecFieldsProps<P>) {
  if (fields.length === 0 && !Extras) return null
  return (
    <FieldRow>
      {fields.map(({ key, label, placeholder }) => (
        <TextField key={key} id={`${requestId}-${key}`} label={label} placeholder={placeholder} {...bind(key)} />
      ))}
      {Extras && <Extras requestId={requestId} />}
    </FieldRow>
  )
}
