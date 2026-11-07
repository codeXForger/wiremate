import { useEffect } from 'react'
import { PanelTabs } from '@/components/PanelTabs'
import type { EditorProps } from '../../types'
import { ConnectionPanel } from '../ConnectionPanel'
import { refreshAll } from './admin-actions'
import { adminView, useAdminView } from './admin-store'
import { ClusterView } from './ClusterView'
import { GroupDetails } from './GroupDetails'
import { GroupList } from './GroupList'
import { TopicDetails } from './TopicDetails'
import { TopicList } from './TopicList'

const TAB = 'flex flex-col'

/** The cluster seen by an admin client: topics, consumer groups and brokers. Loads them the first time it shows. */
export function AdminView({ requestId }: EditorProps) {
  useEffect(() => {
    if (!adminView(requestId).topics) void refreshAll(requestId)
  }, [requestId])
  const view = useAdminView(requestId)
  const tabs = [
    { value: 'topics', label: 'Topics', className: TAB, content: <TopicsTab requestId={requestId} /> },
    { value: 'groups', label: 'Consumer groups', className: TAB, content: <GroupsTab requestId={requestId} /> },
    { value: 'cluster', label: 'Cluster', content: <ClusterView cluster={view.cluster} /> },
    { value: 'connection', label: 'Connection', content: <ConnectionPanel requestId={requestId} /> }
  ]
  return <PanelTabs tabs={tabs} />
}

function TopicsTab({ requestId }: EditorProps) {
  const { topic, topics } = useAdminView(requestId)
  if (topic) return <TopicDetails requestId={requestId} topic={topic} />
  return <TopicList requestId={requestId} topics={topics} />
}

function GroupsTab({ requestId }: EditorProps) {
  const { group, groups } = useAdminView(requestId)
  if (group) return <GroupDetails requestId={requestId} group={group} />
  return <GroupList requestId={requestId} groups={groups} />
}
