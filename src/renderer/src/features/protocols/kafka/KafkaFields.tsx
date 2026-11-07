import type { KafkaConfig } from '@shared/types/protocol'
import { NumberField, SelectField, SwitchField } from '../../request/components/SettingFields'
import { TextField } from '../../request/components/TextField'
import { useConfigBinder, useFieldBinder, type KeysOfType } from '../../request/use-field-binder'
import { useRequestConfig } from '../../request/use-request'

interface FieldProps<K> {
  requestId: string
  field: K
  label: string
}

type ChoiceKey = 'acks' | 'compression' | 'auth' | 'startFrom'

interface TextProps extends FieldProps<KeysOfType<KafkaConfig, string>> {
  placeholder?: string
  type?: 'text' | 'password'
}

/** A text field bound to a Kafka config field; `{{variables}}` are coloured. */
export function KafkaText({ requestId, field, ...props }: TextProps) {
  const bound = useFieldBinder<'kafka'>(requestId)(field)
  return <TextField id={`${requestId}-${field}`} {...props} {...bound} />
}

export function KafkaSwitch({ requestId, field, label }: FieldProps<KeysOfType<KafkaConfig, boolean>>) {
  const bound = useConfigBinder<'kafka', boolean>(requestId)(field)
  return <SwitchField id={`${requestId}-${field}`} label={label} {...bound} />
}

export function KafkaNumber({
  requestId,
  field,
  label,
  zero
}: FieldProps<KeysOfType<KafkaConfig, number>> & { zero?: string }) {
  const bound = useConfigBinder<'kafka', number>(requestId)(field)
  return <NumberField id={`${requestId}-${field}`} label={label} zero={zero} {...bound} />
}

interface ChoiceProps<K extends ChoiceKey> extends FieldProps<K> {
  options: readonly KafkaConfig[K][]
  /** Words for each option; the option itself when missing. */
  labels?: Record<KafkaConfig[K], string>
}

export function KafkaChoice<K extends ChoiceKey>({ requestId, field, label, options, labels }: ChoiceProps<K>) {
  const [config, update] = useRequestConfig<'kafka'>(requestId)
  const bound = { value: config[field], onChange: (value: KafkaConfig[K]) => update({ [field]: value }) }
  const format = (option: KafkaConfig[K]): string => labels?.[option] ?? option
  return <SelectField id={`${requestId}-${field}`} label={label} options={options} format={format} {...bound} />
}
