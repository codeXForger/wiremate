import { useState } from 'react'
import type { KeyValue } from '@shared/types/protocol'
import { Label } from '@/components/ui/label'
import { KeyValueTable } from '../../../request/components/KeyValueTable'
import { createTopic } from './admin-actions'
import { FormDialog, FormField } from './FormDialog'
import { wholeNumber } from './form-values'

interface CreateTopicDialogProps {
  requestId: string
  onClose: () => void
}

interface TopicForm {
  topic: string
  partitions: string
  replicas: string
  configs: KeyValue[]
}

function toNewTopic(form: TopicForm): Parameters<typeof createTopic>[1] {
  const topic = form.topic.trim()
  if (topic === '') throw new Error('Give the topic a name')
  const configs = form.configs.filter((row) => row.enabled && row.key.trim() !== '')
  return {
    topic,
    partitions: wholeNumber(form.partitions, 'Partitions', 1),
    replicas: wholeNumber(form.replicas, 'Replication factor', 1),
    configs: configs.map(({ key, value }) => ({ key: key.trim(), value }))
  }
}

/** Names a new topic, its partitions and replication factor, and any configs it overrides. */
export function CreateTopicDialog({ requestId, onClose }: CreateTopicDialogProps) {
  const [form, setForm] = useState<TopicForm>({ topic: '', partitions: '1', replicas: '1', configs: [] })
  const set = (change: Partial<TopicForm>): void => setForm((current) => ({ ...current, ...change }))
  return (
    <FormDialog
      title="New topic"
      description="Created on the cluster at once. Replication cannot exceed the number of brokers."
      submitLabel="Create topic"
      onSubmit={() => createTopic(requestId, toNewTopic(form))}
      onClose={onClose}
    >
      <TopicFields form={form} set={set} />
    </FormDialog>
  )
}

type TextKey = 'topic' | 'partitions' | 'replicas'

interface TopicFieldsProps {
  form: TopicForm
  set: (change: Partial<TopicForm>) => void
}

function TopicFields({ form, set }: TopicFieldsProps) {
  const bind = (key: TextKey) => ({ id: `topic-${key}`, value: form[key], onChange: (v: string) => set({ [key]: v }) })
  return (
    <>
      <FormField label="Name" autoFocus {...bind('topic')} />
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Partitions" {...bind('partitions')} />
        <FormField label="Replication factor" {...bind('replicas')} />
      </div>
      <ConfigRows form={form} set={set} />
    </>
  )
}

function ConfigRows({ form, set }: TopicFieldsProps) {
  const onChange = (configs: KeyValue[]): void => set({ configs })
  return (
    <>
      <Label>Configs</Label>
      <KeyValueTable label="Config" highlightVariables={false} value={form.configs} onChange={onChange} />
    </>
  )
}
