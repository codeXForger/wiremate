import { useState, type MouseEvent, type ReactNode } from 'react'
import { FlaskConical, History, Variable, X } from 'lucide-react'
import type { AnyRequest } from '@shared/types/protocol'
import type { TestSuite } from '@shared/types/suite'
import type { Environment } from '@shared/types/workspace'
import { itemKeyHandler } from '@/components/item-keys'
import { ItemName } from '@/components/ItemName'
import { RequestBadge } from '@/components/RequestBadge'
import { RenameInput, type Renameable } from '@/components/RenameInput'
import { wireColor } from '@/components/wire'
import { cn } from '@/lib/utils'
import { useSuiteStore } from '@/stores/suite-store'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useRequest } from '../request/use-request'
import { renameEnvironment } from '../environments/environment-actions'
import { historyCategoryOf, historyTitle } from '../history/history-entry'
import { renameSuite } from '../suites/suite-actions'
import { tabKind, type TabKind } from './tab-kind'

export function TabBar() {
  const openIds = useTabStore((state) => state.openIds)
  if (openIds.length === 0) return null
  return (
    <div role="tablist" aria-label="Open requests" className="flex h-9 shrink-0 overflow-x-auto border-b bg-panel">
      {openIds.map((id) => {
        const Tab = TABS[tabKind(id)]
        return <Tab key={id} id={id} />
      })}
    </div>
  )
}

const TAB_CLASS =
  'group flex max-w-56 min-w-0 shrink-0 cursor-default items-center gap-1 border-t-2 border-r pr-1 pl-2.5 text-xs'
const TONE = { active: 'bg-background text-foreground', idle: 'text-muted-foreground hover:text-foreground' }

interface TabShellProps {
  target: Renameable
  /** Colour of the top border while the tab is active. */
  accent: string
  icon: ReactNode
  onRename?: (id: string, name: string) => void
  /** False for tabs whose name is fixed, like a history. */
  renamable?: boolean
}

function tabProps({ target, accent }: TabShellProps, active: boolean, rename: () => void) {
  const activate = (): void => useTabStore.getState().open(target.id)
  return {
    role: 'tab',
    'aria-selected': active,
    tabIndex: 0,
    onClick: activate,
    onDoubleClick: rename,
    onKeyDown: itemKeyHandler({ activate, rename }),
    style: { borderTopColor: active ? accent : 'transparent' },
    className: cn(TAB_CLASS, active ? TONE.active : TONE.idle)
  }
}

function TabShell(props: TabShellProps) {
  const [renaming, setRenaming] = useState(false)
  const active = useTabStore((state) => state.activeId === props.target.id)
  return (
    <div {...tabProps(props, active, () => setRenaming(props.renamable !== false))}>
      {props.icon}
      <TabName {...props} renaming={renaming} onDone={() => setRenaming(false)} />
      <CloseTabButton target={props.target} />
    </div>
  )
}

function TabName({ target, onRename, renaming, onDone }: TabShellProps & { renaming: boolean; onDone: () => void }) {
  if (!renaming) return <ItemName name={target.name} />
  return <RenameInput target={target} onRename={onRename} onDone={onDone} />
}

function RequestTab({ id }: { id: string }) {
  const request = useRequest(id)
  return request ? <RequestTabContent request={request} /> : null
}

function RequestTabContent({ request }: { request: AnyRequest }) {
  const icon = <RequestBadge requestId={request.id} protocol={request.protocol} className="w-auto" />
  return <TabShell target={request} accent={wireColor(request.protocol)} icon={icon} />
}

function SuiteTab({ id }: { id: string }) {
  const suite = useSuiteStore((state) => state.suites.find((candidate) => candidate.id === id))
  return suite ? <SuiteTabContent suite={suite} /> : null
}

function SuiteTabContent({ suite }: { suite: TestSuite }) {
  const icon = <FlaskConical className="size-3 shrink-0 text-muted-foreground" />
  return <TabShell target={suite} accent="var(--primary)" icon={icon} onRename={renameSuite} />
}

function EnvironmentTab({ id }: { id: string }) {
  const environment = useWorkspaceStore((state) => state.environments.find((env) => env.id === id))
  return environment ? <EnvironmentTabContent environment={environment} /> : null
}

function EnvironmentTabContent({ environment }: { environment: Environment }) {
  const icon = <Variable className="size-3 shrink-0 text-muted-foreground" />
  return <TabShell target={environment} accent="var(--primary)" icon={icon} onRename={renameEnvironment} />
}

function HistoryTab({ id }: { id: string }) {
  const category = historyCategoryOf(id) ?? 'api'
  const icon = <History className="size-3 shrink-0 text-muted-foreground" />
  return (
    <TabShell target={{ id, name: historyTitle(category) }} accent="var(--primary)" icon={icon} renamable={false} />
  )
}

const TABS: Record<TabKind, (props: { id: string }) => ReactNode> = {
  request: RequestTab,
  suite: SuiteTab,
  environment: EnvironmentTab,
  history: HistoryTab
}

const CLOSE_CLASS = 'ml-1 flex size-5 shrink-0 items-center justify-center rounded hover:bg-surface'

function CloseTabButton({ target }: { target: Renameable }) {
  const dirty = useTabStore((state) => state.dirtyIds.includes(target.id))
  const close = (event: MouseEvent): void => {
    event.stopPropagation()
    useTabStore.getState().close(target.id)
  }
  return (
    <button type="button" aria-label={`Close ${target.name}`} onClick={close} className={CLOSE_CLASS}>
      {dirty && <span aria-label="Unsaved changes" className="size-2 rounded-full bg-primary group-hover:hidden" />}
      <X className={cn('size-3', dirty && 'hidden group-hover:block')} />
    </button>
  )
}
