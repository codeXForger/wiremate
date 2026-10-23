import { useSuiteStore } from './suite-store'
import { useTabStore } from './tab-store'
import { useWorkspaceStore } from './workspace-store'

function retainOpenTabs(): void {
  const { requests, environments } = useWorkspaceStore.getState()
  const suiteIds = useSuiteStore.getState().suites.map((suite) => suite.id)
  const environmentIds = environments.map((env) => env.id)
  useTabStore.getState().retain(new Set([...Object.keys(requests), ...suiteIds, ...environmentIds]))
}

/** Observer wiring: tabs follow the requests, environments and suites that exist; suites load with their workspace. */
export function connectStores(): () => void {
  const stopWorkspace = useWorkspaceStore.subscribe((state, previous) => {
    if (state.requests !== previous.requests || state.environments !== previous.environments) retainOpenTabs()
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
