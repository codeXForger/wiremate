import { useState } from 'react'
import { parseOffset, recordLocation } from '@shared/kafka/kafka-text'
import type { KafkaHeader, KafkaPartitionInfo, KafkaTopicDetails } from '@shared/types/kafka'
import { addPartitions, deleteRecords, setTopicConfig } from './admin-actions'
import { FormDialog, FormField, type DialogCopy } from './FormDialog'
import { wholeNumber } from './form-values'

interface TopicDialogProps {
  requestId: string
  topic: KafkaTopicDetails
  onClose: () => void
}

function partitionsCopy(topic: KafkaTopicDetails): DialogCopy {
  return {
    title: `Add partitions to ${topic.name}`,
    description: `It has ${topic.partitions.length}. Records with a key may land on another partition than before.`,
    submitLabel: 'Add partitions'
  }
}

/** Grows a topic to more partitions; Kafka never shrinks one. */
export function PartitionsDialog({ requestId, topic, onClose }: TopicDialogProps) {
  const current = topic.partitions.length
  const [count, setCount] = useState(String(current + 1))
  const copy = partitionsCopy(topic)
  const submit = (): Promise<boolean> =>
    addPartitions(requestId, topic.name, wholeNumber(count, 'Partitions', current + 1))
  return (
    <FormDialog {...copy} onSubmit={submit} onClose={onClose}>
      <FormField id="partition-count" label="Partitions in total" autoFocus value={count} onChange={setCount} />
    </FormDialog>
  )
}

function saveConfig(requestId: string, topic: string, entry: KafkaHeader): Promise<boolean> {
  const key = entry.key.trim()
  if (key === '') throw new Error('Name the config, e.g. retention.ms')
  return setTopicConfig(requestId, topic, { key, value: entry.value })
}

/** Sets a config on the topic; an existing name is edited, a new one added as an override. */
export function ConfigDialog({ requestId, topic, onClose, name = '' }: TopicDialogProps & { name?: string }) {
  const [key, setKey] = useState(name)
  const [value, setValue] = useState(topic.configs.find((entry) => entry.name === name)?.value ?? '')
  const copy = { title: 'Set config', description: `Overrides the default for ${topic.name}.`, submitLabel: 'Save' }
  const submit = (): Promise<boolean> => saveConfig(requestId, topic.name, { key, value })
  return (
    <FormDialog {...copy} onSubmit={submit} onClose={onClose}>
      <FormField id="config-name" label="Name" placeholder="retention.ms" value={key} onChange={setKey} />
      <FormField id="config-value" label="Value" autoFocus value={value} onChange={setValue} />
    </FormDialog>
  )
}

interface DeleteRecordsDialogProps {
  requestId: string
  topic: string
  partition: KafkaPartitionInfo
  onClose: () => void
}

/** Deletes a partition's oldest records, up to an offset (by default, all of them). */
export function DeleteRecordsDialog({ requestId, topic, partition, onClose }: DeleteRecordsDialogProps) {
  const [before, setBefore] = useState(partition.latest)
  const copy = {
    title: `Delete records of ${recordLocation({ topic, partition: partition.partition, offset: '' })}`,
    description: 'Every record before the offset is deleted for good. The partition then starts there.',
    submitLabel: 'Delete records'
  }
  const submit = (): Promise<boolean> =>
    deleteRecords(requestId, { topic, partition: partition.partition, before: parseOffset(before) })
  return (
    <FormDialog {...copy} onSubmit={submit} onClose={onClose}>
      <FormField id="records-before" label="Before offset" autoFocus value={before} onChange={setBefore} />
    </FormDialog>
  )
}
