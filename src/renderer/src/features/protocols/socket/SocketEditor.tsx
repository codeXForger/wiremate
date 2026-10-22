import type { PayloadEncoding } from '@shared/types/protocol'
import { Column } from '@/components/Column'
import { Input } from '@/components/ui/input'
import { ConnectBar } from '../../request/components/ConnectBar'
import { Field } from '../../request/components/Field'
import { FieldRow } from '../../request/components/FieldRow'
import { MessageComposer } from '../../request/components/MessageComposer'
import { OptionSelect } from '../../request/components/OptionSelect'
import { useConfigBinder, useFieldBinder } from '../../request/use-field-binder'
import { useRequestConfig } from '../../request/use-request'
import type { EditorProps } from '../types'
import { formatTarget, parsePort } from './parse-target'

const ENCODINGS: readonly PayloadEncoding[] = ['text', 'hex']

/** Shared by TCP and UDP: both address a host and port and send a raw payload. */
export function SocketEditor({ requestId }: EditorProps) {
  const target = formatTarget(useRequestConfig<'tcp'>(requestId)[0])
  const bind = useFieldBinder<'tcp'>(requestId)
  return (
    <Column>
      <ConnectBar requestId={requestId} label="Host" target={target} {...bind('host')} />
      <FieldRow>
        <PortField requestId={requestId} />
        <EncodingField requestId={requestId} />
      </FieldRow>
      <MessageComposer requestId={requestId} label="Payload" language="plaintext" {...bind('payload')} />
    </Column>
  )
}

function PortField({ requestId }: EditorProps) {
  const port = useConfigBinder<'tcp', number>(requestId)('port')
  const id = `${requestId}-port`
  const value = port.value === 0 ? '' : String(port.value)
  return (
    <Field label="Port" htmlFor={id}>
      <Input id={id} inputMode="numeric" value={value} onChange={(e) => port.onChange(parsePort(e.target.value))} />
    </Field>
  )
}

function EncodingField({ requestId }: EditorProps) {
  const encoding = useConfigBinder<'tcp', PayloadEncoding>(requestId)('encoding')
  return (
    <Field label="Encoding" htmlFor={`${requestId}-encoding`}>
      <OptionSelect label="Encoding" options={ENCODINGS} {...encoding} />
    </Field>
  )
}
