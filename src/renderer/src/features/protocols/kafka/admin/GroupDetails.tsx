import { RotateCcw, Trash2, X } from 'lucide-react'
import type { KafkaGroupDetails, KafkaGroupMember, KafkaGroupOffset } from '@shared/types/kafka'
import { Column } from '@/components/Column'
import { IconButton } from '@/components/IconButton'
import { Button } from '@/components/ui/button'
import { askToDeleteGroup, askToDeleteGroupOffsets, closeGroup } from './admin-actions'
import { DetailHeader, IconDialogButton, Section } from './AdminParts'
import { AdminTable, type AdminColumn } from './AdminTable'
import { lagByTopic, type TopicLag } from './group-lag'
import { ResetOffsetsDialog } from './ResetOffsetsDialog'

interface GroupProps {
  requestId: string
  group: KafkaGroupDetails
}

/** One consumer group: its members, and what it has committed on each partition with the lag behind. */
export function GroupDetails({ requestId, group }: GroupProps) {
  return (
    <Column>
      <DetailHeader back="All groups" title={`${group.id} · ${group.state}`} onBack={() => closeGroup(requestId)}>
        <DeleteGroupButton requestId={requestId} groupId={group.id} />
      </DetailHeader>
      <div className="min-h-0 flex-1 overflow-auto">
        <MembersSection group={group} />
        <TopicsSection requestId={requestId} group={group} />
        <OffsetsSection group={group} />
      </div>
    </Column>
  )
}

function DeleteGroupButton({ requestId, groupId }: { requestId: string; groupId: string }) {
  return (
    <Button size="sm" variant="destructive" onClick={() => askToDeleteGroup(requestId, groupId)}>
      <Trash2 /> Delete group
    </Button>
  )
}

const MEMBER_COLUMNS: AdminColumn<KafkaGroupMember>[] = [
  { header: 'Member', cell: (m) => <span className="font-mono break-all">{m.id}</span> },
  { header: 'Client', cell: (m) => m.clientId },
  { header: 'Host', cell: (m) => m.host },
  { header: 'Assigned', cell: (m) => <span className="font-mono">{m.assignments.join(' ') || 'Nothing'}</span> }
]

function MembersSection({ group }: { group: KafkaGroupDetails }) {
  return (
    <Section title={`Members (${group.members.length})`}>
      <AdminTable
        label="Members"
        columns={MEMBER_COLUMNS}
        rows={group.members}
        rowKey={(m) => m.id}
        empty="No active members."
      />
    </Section>
  )
}

const TOPIC_COLUMNS: AdminColumn<TopicLag>[] = [
  { header: 'Topic', cell: (t) => <span className="font-mono">{t.topic}</span> },
  { header: 'Partitions', cell: (t) => t.partitions, numeric: true },
  { header: 'Lag', cell: (t) => String(t.lag), numeric: true }
]

function TopicsSection({ requestId, group }: GroupProps) {
  const actions = (row: TopicLag): React.ReactNode => (
    <TopicActions requestId={requestId} group={group} topic={row.topic} />
  )
  const table = { columns: [...TOPIC_COLUMNS, { header: 'Actions', cell: actions }], rows: lagByTopic(group.offsets) }
  return (
    <Section title="Topics">
      <AdminTable label="Topics" {...table} rowKey={(t) => t.topic} empty="Nothing committed yet." />
    </Section>
  )
}

function TopicActions({ requestId, group, topic }: GroupProps & { topic: string }) {
  const reset = (close: () => void): React.ReactNode => (
    <ResetOffsetsDialog requestId={requestId} groupId={group.id} topic={topic} onClose={close} />
  )
  const remove = (): void => askToDeleteGroupOffsets(requestId, group.id, topic)
  return (
    <span className="flex gap-1">
      <IconDialogButton label={`Reset offsets on ${topic}`} icon={RotateCcw} dialog={reset} />
      <IconButton label={`Delete offsets on ${topic}`} icon={X} onClick={remove} />
    </span>
  )
}

const OFFSET_COLUMNS: AdminColumn<KafkaGroupOffset>[] = [
  { header: 'Topic', cell: (o) => <span className="font-mono">{o.topic}</span> },
  { header: 'Partition', cell: (o) => o.partition, numeric: true },
  { header: 'Committed', cell: (o) => o.committed, numeric: true },
  { header: 'Latest', cell: (o) => o.latest, numeric: true },
  { header: 'Lag', cell: (o) => o.lag, numeric: true }
]

function OffsetsSection({ group }: { group: KafkaGroupDetails }) {
  const key = (o: KafkaGroupOffset): string => `${o.topic}-${o.partition}`
  return (
    <Section title="Committed offsets">
      <AdminTable
        label="Offsets"
        columns={OFFSET_COLUMNS}
        rows={group.offsets}
        rowKey={key}
        empty="Nothing committed yet."
      />
    </Section>
  )
}
