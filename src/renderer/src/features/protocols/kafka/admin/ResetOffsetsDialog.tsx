import { useState } from 'react'
import { parseOffset, parseTimestamp } from '@shared/kafka/kafka-text'
import { KAFKA_RESET_TARGETS, type KafkaResetTarget } from '@shared/types/kafka'
import { SelectField } from '../../../request/components/SettingFields'
import { resetOffsets, type OffsetReset } from './admin-actions'
import { FormDialog, FormField } from './FormDialog'

interface ResetOffsetsDialogProps {
  requestId: string
  groupId: string
  topic: string
  onClose: () => void
}

const TARGET_LABELS: Record<KafkaResetTarget, string> = {
  earliest: 'Earliest offset',
  latest: 'Latest offset',
  timestamp: 'A date and time',
  offset: 'An exact offset'
}

const VALUE_HINTS: Partial<Record<KafkaResetTarget, string>> = {
  timestamp: '2026-01-31T09:00:00Z or epoch ms',
  offset: '0'
}

/** Checks the value a target needs before the call goes out; the ends of the partitions need none. */
function checked(reset: OffsetReset): OffsetReset {
  if (reset.target === 'timestamp') parseTimestamp(reset.value)
  if (reset.target === 'offset') parseOffset(reset.value)
  return VALUE_HINTS[reset.target] ? reset : { ...reset, value: '' }
}

/** Moves a group's committed offsets on one topic. The group must have no active members. */
export function ResetOffsetsDialog({ requestId, groupId, topic, onClose }: ResetOffsetsDialogProps) {
  const [target, setTarget] = useState<KafkaResetTarget>('earliest')
  const [value, setValue] = useState('')
  const copy = {
    title: `Reset offsets of ${groupId}`,
    description: `Moves every partition of ${topic}. Stop the group's consumers first.`,
    submitLabel: 'Reset offsets'
  }
  const submit = (): Promise<boolean> => resetOffsets(requestId, checked({ groupId, topic, target, value }))
  return (
    <FormDialog {...copy} onSubmit={submit} onClose={onClose}>
      <ResetFields target={target} setTarget={setTarget} value={value} setValue={setValue} />
    </FormDialog>
  )
}

interface ResetFieldsProps {
  target: KafkaResetTarget
  setTarget: (target: KafkaResetTarget) => void
  value: string
  setValue: (value: string) => void
}

function ResetFields({ target, setTarget, value, setValue }: ResetFieldsProps) {
  const hint = VALUE_HINTS[target]
  const select = { options: KAFKA_RESET_TARGETS, format: (t: KafkaResetTarget) => TARGET_LABELS[t] }
  const input = { id: 'reset-value', label: TARGET_LABELS[target], placeholder: hint, value, onChange: setValue }
  return (
    <>
      <SelectField id="reset-target" label="Move to" value={target} onChange={setTarget} {...select} />
      {hint && <FormField {...input} />}
    </>
  )
}
