import { CATEGORY_IDS } from '@shared/protocols/categories'
import { historyTabId } from '@/features/history/history-entry'
import { socketSessions } from '@/features/protocols/socket/socket-actions'
import { useHistoryStore } from './history-store'
import { useMessageStore } from './message-store'
import { useSuiteStore } from './suite-store'
import { useTabStore } from './tab-store'
import { useWorkspaceStore } from './workspace-store'

function retainOpenTabs(): void {
  const { requests, environments } = useWorkspaceStore.getState()
  const suiteIds = useSuiteStore.getState().suites.map((suite) => suite.id)
  const messageIds = useMessageStore.getState().messages.map((message) => message.id)
  const environmentIds = environments.map((env) => env.id)
  const historyIds = CATEGORY_IDS.map(historyTabId)
  useTabStore
    .getState()
    .retain(new Set([...Object.keys(requests), ...suiteIds, ...messageIds, ...environmentIds, ...historyIds]))
}

type WorkspaceState = ReturnType<typeof useWorkspaceStore.getState>

function followWorkspace(state: WorkspaceState, previous: WorkspaceState): void {
  if (state.requests !== previous.requests || state.environments !== previous.environments) retainOpenTabs()
  if (state.requests !== previous.requests) socketSessions.retain(new Set(Object.keys(state.requests)))
  if (state.activeWorkspaceId === previous.activeWorkspaceId) return
  void useSuiteStore.getState().load()
  void useHistoryStore.getState().load('api')
  void useMessageStore.getState().load()
}

/** Observer wiring: tabs and open sockets follow what exists; suites, history and messages load with their workspace. */
export function connectStores(): () => void {
  const stopWorkspace = useWorkspaceStore.subscribe(followWorkspace)
  const stopSuites = useSuiteStore.subscribe((state, previous) => {
    if (state.suites !== previous.suites) retainOpenTabs()
  })
  const stopMessages = useMessageStore.subscribe((state, previous) => {
    if (state.messages !== previous.messages) retainOpenTabs()
  })
  return () => [stopWorkspace, stopSuites, stopMessages].forEach((stop) => stop())
}
