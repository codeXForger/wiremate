import { useState } from 'react'
import type { KafkaGroupSummary } from '@shared/types/kafka'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { openGroup } from './admin-actions'
import { ListToolbar } from './AdminParts'
import { AdminTable, type AdminColumn } from './AdminTable'

const COLUMNS: AdminColumn<KafkaGroupSummary>[] = [
  { header: 'Group', cell: (group) => <span className="font-mono">{group.id}</span> },
  { header: 'State', cell: (group) => group.state },
  { header: 'Type', cell: (group) => group.protocolType || 'consumer' }
]

interface GroupListProps {
  requestId: string
  groups: KafkaGroupSummary[] | undefined
}

/** The consumer groups the cluster knows, filtered by id. */
export function GroupList({ requestId, groups }: GroupListProps) {
  const [filter, setFilter] = useState('')
  const shown = (groups ?? []).filter((group) => group.id.includes(filter.trim()))
  return (
    <Column>
      <ListToolbar label="Filter groups" filter={filter} onFilter={setFilter} />
      <GroupTable requestId={requestId} groups={groups} shown={shown} />
    </Column>
  )
}

function GroupTable({ requestId, groups, shown }: GroupListProps & { shown: KafkaGroupSummary[] }) {
  if (!groups) return <Hint>Loading the consumer groups… Refresh if the brokers were not reachable.</Hint>
  const empty = groups.length === 0 ? 'No consumer group has joined yet.' : 'No group matches.'
  const open = (group: KafkaGroupSummary): void => void openGroup(requestId, group.id)
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <AdminTable label="Groups" columns={COLUMNS} rows={shown} rowKey={(g) => g.id} onOpen={open} empty={empty} />
    </div>
  )
}
