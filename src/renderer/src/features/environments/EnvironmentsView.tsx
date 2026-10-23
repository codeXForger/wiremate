import { Plus, Variable } from 'lucide-react'
import type { Environment } from '@shared/types/workspace'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { SidebarHeader } from '@/components/SidebarHeader'
import { SidebarItemList } from '@/components/SidebarItemList'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { askToDeleteEnvironment } from '../confirm/confirm-delete'
import { createAndOpenEnvironment, renameEnvironment } from './environment-actions'

const EMPTY_HINT =
  'No environments yet. An environment holds the values {{variables}} stand for, like a base URL or a token.'

/** The Env pane: every environment of the workspace. Click one to edit its variables in a tab. */
export function EnvironmentsView() {
  return (
    <Column>
      <SidebarHeader title="Environments">
        <IconButton label="New environment" icon={Plus} onClick={createAndOpenEnvironment} />
      </SidebarHeader>
      <EnvironmentList />
    </Column>
  )
}

function EnvironmentList() {
  const environments = useWorkspaceStore((state) => state.environments)
  if (environments.length === 0) return <Hint>{EMPTY_HINT}</Hint>
  const actions = { icon: Variable, onRename: renameEnvironment, onDelete: askToDeleteEnvironment, badge: activeBadge }
  return <SidebarItemList label="Environments" items={environments} {...actions} />
}

function activeBadge(environment: Environment) {
  return <ActiveBadge id={environment.id} />
}

export function ActiveBadge({ id }: { id: string }) {
  const active = useWorkspaceStore((state) => state.activeEnvironmentId === id)
  if (!active) return null
  return <span className="rounded bg-primary/15 px-1.5 text-[10px] text-primary">active</span>
}
