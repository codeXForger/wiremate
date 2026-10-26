import { CATEGORIES, isCategoryId, type CategoryId } from '@shared/protocols/categories'
import type { ProtocolId } from '@shared/types/protocol'
import { useTabStore } from '@/stores/tab-store'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function createAndOpenRequest(parentId: string | null, protocol: ProtocolId): void {
  useTabStore.getState().open(useWorkspaceStore.getState().addRequest(parentId, protocol))
}

/** Duplicates a request and opens the copy in a tab. */
export function duplicateAndOpen(requestId: string): void {
  const copyId = useWorkspaceStore.getState().duplicateRequest(requestId)
  if (copyId) useTabStore.getState().open(copyId)
}

/** Single-protocol categories create the request straight away; others ask which protocol to use. */
export function startNewRequest(parentId: string | null, category: CategoryId): void {
  const [first, ...others] = CATEGORIES[category].protocols
  if (first && others.length === 0) createAndOpenRequest(parentId, first)
  else useUiStore.getState().openDialog({ type: 'new-request', parentId, category })
}

/** The category whose pane is open, or API when a utility view (settings, history…) is showing. */
export function currentCategory(): CategoryId {
  const { view } = useUiStore.getState()
  return isCategoryId(view) ? view : 'api'
}
