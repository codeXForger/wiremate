import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app/App'
import { useResponseStore } from '@/stores/response-store'
import { useTabStore } from '@/stores/tab-store'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function resetStores(): void {
  useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true)
  useTabStore.setState(useTabStore.getInitialState(), true)
  useUiStore.setState(useUiStore.getInitialState(), true)
  useResponseStore.setState(useResponseStore.getInitialState(), true)
}

export async function renderApp() {
  resetStores()
  const user = userEvent.setup()
  const utils = render(<App />)
  await screen.findByRole('treeitem', { name: /List users/ })
  return { user, ...utils }
}

export async function openRequest(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('treeitem', { name }))
  return screen.getByRole('region', { name: /request$/ })
}

export async function createRequest(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(screen.getAllByRole('button', { name: 'New request' })[0]!)
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: label }))
  return screen.getByRole('region', { name: /request$/ })
}
