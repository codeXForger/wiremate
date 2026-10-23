import { useSuiteStore } from './suite-store'
import { useTabStore } from './tab-store'
import { useWorkspaceStore } from './workspace-store'

function retainOpenTabs(): void {
  const requestIds = Object.keys(useWorkspaceStore.getState().requests)
  const suiteIds = useSuiteStore.getState().suites.map((suite) => suite.id)
  useTabStore.getState().retain(new Set([...requestIds, ...suiteIds]))
}

/** Observer wiring: tabs follow the requests and suites that exist; suites load with their workspace. */
export function connectStores(): () => void {
  const stopWorkspace = useWorkspaceStore.subscribe((state, previous) => {
    if (state.requests !== previous.requests) retainOpenTabs()
    if (state.activeWorkspaceId !== previous.activeWorkspaceId) void useSuiteStore.getState().load()
  })
  const stopSuites = useSuiteStore.subscribe((state, previous) => {
    if (state.suites !== previous.suites) retainOpenTabs()
  })
  return () => {
    stopWorkspace()
    stopSuites()
  }
}
