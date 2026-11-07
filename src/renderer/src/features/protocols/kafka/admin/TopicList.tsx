import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { KafkaTopicSummary } from '@shared/types/kafka'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { SwitchField } from '../../../request/components/SettingFields'
import { openTopic } from './admin-actions'
import { DialogButton, ListToolbar } from './AdminParts'
import { AdminTable, type AdminColumn } from './AdminTable'
import { CreateTopicDialog } from './CreateTopicDialog'

const COLUMNS: AdminColumn<KafkaTopicSummary>[] = [
  { header: 'Topic', cell: (topic) => <span className="font-mono">{topic.name}</span> },
  { header: 'Partitions', cell: (topic) => topic.partitions, numeric: true },
  { header: 'Replicas', cell: (topic) => topic.replicas, numeric: true }
]

interface TopicListProps {
  requestId: string
  topics: KafkaTopicSummary[] | undefined
}

/** The cluster's topics, filtered by name; internal ones (`__consumer_offsets`) only on request. */
export function TopicList({ requestId, topics }: TopicListProps) {
  const [filter, setFilter] = useState('')
  const [internal, setInternal] = useState(false)
  const shown = (topics ?? []).filter((topic) => (internal || !topic.internal) && topic.name.includes(filter.trim()))
  return (
    <Column>
      <ListToolbar label="Filter topics" filter={filter} onFilter={setFilter}>
        <SwitchField id={`${requestId}-internal`} label="Internal topics" value={internal} onChange={setInternal} />
        <NewTopicButton requestId={requestId} />
      </ListToolbar>
      <TopicTable requestId={requestId} topics={topics} shown={shown} />
    </Column>
  )
}

function TopicTable({ requestId, topics, shown }: TopicListProps & { shown: KafkaTopicSummary[] }) {
  if (!topics) return <Hint>Loading the topics of the cluster… Refresh if the brokers were not reachable.</Hint>
  const empty = topics.length === 0 ? 'The cluster has no topics yet.' : 'No topic matches.'
  const open = (topic: KafkaTopicSummary): void => void openTopic(requestId, topic.name)
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <AdminTable label="Topics" columns={COLUMNS} rows={shown} rowKey={(t) => t.name} onOpen={open} empty={empty} />
    </div>
  )
}

function NewTopicButton({ requestId }: { requestId: string }) {
  const dialog = (close: () => void): React.ReactNode => <CreateTopicDialog requestId={requestId} onClose={close} />
  return <DialogButton label="New topic" icon={Plus} dialog={dialog} />
}
