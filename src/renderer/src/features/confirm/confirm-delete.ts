import type { TestSuite } from '@shared/types/suite'
import type { Environment, TreeNode } from '@shared/types/workspace'
import { CATEGORIES, type CategoryId } from '@shared/protocols/categories'
import { useHistoryStore } from '@/stores/history-store'
import { useSuiteStore } from '@/stores/suite-store'
import { useUiStore, type DeleteConfirmation } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { collectSubtreeIds } from '../explorer/tree-utils'

/** Nothing is deleted until the user confirms in a dialog. */
export function confirmDelete(confirmation: DeleteConfirmation): void {
  useUiStore.getState().openDialog({ type: 'confirm-delete', ...confirmation })
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function folderMessage(nodes: TreeNode[], folder: TreeNode): string {
  const inside = collectSubtreeIds(nodes, folder.id)
  const requests = nodes.filter((node) => inside.has(node.id) && node.kind === 'request').length
  if (requests === 0) return `The folder "${folder.name}" is empty.`
  return `"${folder.name}" and the ${plural(requests, 'request')} in it will be deleted.`
}

export function askToDeleteNode(node: TreeNode): void {
  const store = useWorkspaceStore.getState()
  const folder = node.kind === 'folder'
  confirmDelete({
    title: folder ? 'Delete folder?' : 'Delete request?',
    message: folder ? folderMessage(store.nodes, node) : `The request "${node.name}" will be deleted.`,
    onConfirm: () => useWorkspaceStore.getState().removeNode(node.id)
  })
}

export function askToDeleteEnvironment(environment: Environment): void {
  const count = environment.variables.length
  confirmDelete({
    title: 'Delete environment?',
    message: `"${environment.name}" and its ${plural(count, 'variable')} will be deleted.`,
    onConfirm: () => useWorkspaceStore.getState().removeEnvironment(environment.id)
  })
}

export function askToDeleteSuite(suite: TestSuite): void {
  confirmDelete({
    title: 'Delete test suite?',
    message: `"${suite.name}" and its run history will be deleted.`,
    onConfirm: () => useSuiteStore.getState().remove(suite.id)
  })
}

export function askToClearHistory(category: CategoryId, total: number): void {
  confirmDelete({
    title: 'Clear history?',
    message: `All ${plural(total, 'request')} in the ${CATEGORIES[category].label} history will be removed.`,
    onConfirm: () => useHistoryStore.getState().clear(category)
  })
}
