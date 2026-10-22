import { useTabStore } from './tab-store'
import { useWorkspaceStore } from './workspace-store'

/** Observer wiring: tabs follow the requests that exist in the active workspace. */
export function connectStores(): () => void {
  return useWorkspaceStore.subscribe((state, previous) => {
    if (state.requests !== previous.requests) {
      useTabStore.getState().retain(new Set(Object.keys(state.requests)))
    }
  })
}
