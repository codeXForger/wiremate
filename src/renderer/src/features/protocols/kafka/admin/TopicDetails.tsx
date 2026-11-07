import { Eraser, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import type { KafkaConfigEntry, KafkaPartitionInfo, KafkaTopicDetails } from '@shared/types/kafka'
import { Column } from '@/components/Column'
import { IconButton } from '@/components/IconButton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { askToDeleteTopic, closeTopic, resetTopicConfig } from './admin-actions'
import { DetailHeader, DialogButton, IconDialogButton, Section } from './AdminParts'
import { AdminTable, type AdminColumn } from './AdminTable'
import { ConfigDialog, DeleteRecordsDialog, PartitionsDialog } from './TopicDialogs'

interface TopicProps {
  requestId: string
  topic: KafkaTopicDetails
}

/** One topic: its partitions with their offsets, and its configuration. */
export function TopicDetails({ requestId, topic }: TopicProps) {
  return (
    <Column>
      <DetailHeader back="All topics" title={topic.name} onBack={() => closeTopic(requestId)}>
        <TopicActions requestId={requestId} topic={topic} />
      </DetailHeader>
      <div className="min-h-0 flex-1 overflow-auto">
        <PartitionsSection requestId={requestId} topic={topic} />
        <ConfigsSection requestId={requestId} topic={topic} />
      </div>
    </Column>
  )
}

function TopicActions({ requestId, topic }: TopicProps) {
  const grow = (close: () => void): React.ReactNode => (
    <PartitionsDialog requestId={requestId} topic={topic} onClose={close} />
  )
  return (
    <>
      <DialogButton label="Add partitions" icon={Plus} dialog={grow} />
      <Button size="sm" variant="destructive" onClick={() => askToDeleteTopic(requestId, topic.name)}>
        <Trash2 /> Delete topic
      </Button>
    </>
  )
}

const records = (partition: KafkaPartitionInfo): bigint => BigInt(partition.latest) - BigInt(partition.earliest)

const PARTITION_COLUMNS: AdminColumn<KafkaPartitionInfo>[] = [
  { header: 'Partition', cell: (p) => p.partition, numeric: true },
  { header: 'Leader', cell: (p) => p.leader, numeric: true },
  { header: 'Replicas', cell: (p) => p.replicas.join(', '), numeric: true },
  { header: 'In sync', cell: (p) => p.isr.join(', '), numeric: true },
  { header: 'Earliest', cell: (p) => p.earliest, numeric: true },
  { header: 'Latest', cell: (p) => p.latest, numeric: true },
  { header: 'Records', cell: (p) => String(records(p)), numeric: true }
]

function PartitionsSection({ requestId, topic }: TopicProps) {
  const total = topic.partitions.reduce((sum, partition) => sum + records(partition), 0n)
  const trim = (partition: KafkaPartitionInfo): React.ReactNode => (
    <TrimButton requestId={requestId} topic={topic.name} partition={partition} />
  )
  const table = { columns: [...PARTITION_COLUMNS, { header: 'Actions', cell: trim }], rows: topic.partitions }
  return (
    <Section title={`Partitions (${topic.partitions.length}) · ${total} records`}>
      <AdminTable label="Partitions" {...table} rowKey={(p) => String(p.partition)} empty="No partitions." />
    </Section>
  )
}

interface TrimButtonProps {
  requestId: string
  topic: string
  partition: KafkaPartitionInfo
}

function TrimButton(props: TrimButtonProps) {
  const dialog = (close: () => void): React.ReactNode => <DeleteRecordsDialog {...props} onClose={close} />
  return (
    <IconDialogButton
      label={`Delete records of partition ${props.partition.partition}`}
      icon={Eraser}
      dialog={dialog}
    />
  )
}

/** Overrides first, then the defaults the topic inherits. */
function byOverride(a: KafkaConfigEntry, b: KafkaConfigEntry): number {
  return Number(b.overridden) - Number(a.overridden) || a.name.localeCompare(b.name)
}

const CONFIG_COLUMNS: AdminColumn<KafkaConfigEntry>[] = [
  { header: 'Name', cell: (c) => <span className={cn('font-mono', c.overridden && 'font-semibold')}>{c.name}</span> },
  { header: 'Value', cell: (c) => <span className="font-mono break-all">{c.sensitive ? '••••••' : c.value}</span> },
  { header: 'Source', cell: (c) => (c.overridden ? 'Topic' : 'Default') }
]

function configTable({ requestId, topic }: TopicProps) {
  const actions = (entry: KafkaConfigEntry): React.ReactNode => (
    <ConfigActions requestId={requestId} topic={topic} entry={entry} />
  )
  return {
    columns: [...CONFIG_COLUMNS, { header: 'Actions', cell: actions }],
    rows: [...topic.configs].sort(byOverride)
  }
}

function ConfigsSection({ requestId, topic }: TopicProps) {
  const add = (close: () => void): React.ReactNode => (
    <ConfigDialog requestId={requestId} topic={topic} onClose={close} />
  )
  const table = configTable({ requestId, topic })
  return (
    <Section title="Configuration" action={<DialogButton label="Set config" icon={Plus} dialog={add} />}>
      <AdminTable label="Configs" {...table} rowKey={(c) => c.name} empty="No configs." />
    </Section>
  )
}

function ConfigActions({ requestId, topic, entry }: TopicProps & { entry: KafkaConfigEntry }) {
  if (entry.readOnly) return null
  const edit = (close: () => void): React.ReactNode => (
    <ConfigDialog requestId={requestId} topic={topic} name={entry.name} onClose={close} />
  )
  const reset = (): void => void resetTopicConfig(requestId, topic.name, entry.name)
  return (
    <span className="flex gap-1">
      <IconDialogButton label={`Edit ${entry.name}`} icon={Pencil} dialog={edit} />
      {entry.overridden && <IconButton label={`Reset ${entry.name}`} icon={Undo2} onClick={reset} />}
    </span>
  )
}
