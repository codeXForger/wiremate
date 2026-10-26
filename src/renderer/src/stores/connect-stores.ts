import { CATEGORY_IDS } from '@shared/protocols/categories'
import { historyTabId } from '@/features/history/history-entry'
import { useHistoryStore } from './history-store'
import { useSuiteStore } from './suite-store'
import { useTabStore } from './tab-store'
import { useWorkspaceStore } from './workspace-store'

function retainOpenTabs(): void {
  const { requests, environments } = useWorkspaceStore.getState()
  const suiteIds = useSuiteStore.getState().suites.map((suite) => suite.id)
  const environmentIds = environments.map((env) => env.id)
  const historyIds = CATEGORY_IDS.map(historyTabId)
  useTabStore.getState().retain(new Set([...Object.keys(requests), ...suiteIds, ...environmentIds, ...historyIds]))
}

/** Observer wiring: tabs follow what exists; suites and history load with their workspace. */
export function connectStores(): () => void {
  const stopWorkspace = useWorkspaceStore.subscribe((state, previous) => {
    if (state.requests !== previous.requests || state.environments !== previous.environments) retainOpenTabs()
    if (state.activeWorkspaceId === previous.activeWorkspaceId) return
    void useSuiteStore.getState().load()
    void useHistoryStore.getState().load('api')
  })
  const stopSuites = useSuiteStore.subscribe((state, previous) => {
    if (state.suites !== previous.suites) retainOpenTabs()
  })
  return () => {
    stopWorkspace()
    stopSuites()
  }
}
