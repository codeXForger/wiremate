import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app/App'
import { useConsoleStore } from '@/stores/console-store'
import { useResponseStore } from '@/stores/response-store'
import { services } from '@/services'
import { MemorySuiteRepository } from '@/services/suite-repository'
import { useSessionVariables } from '@/stores/session-variables'
import { useSuiteStore } from '@/stores/suite-store'
import { useTabStore } from '@/stores/tab-store'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export type User = ReturnType<typeof userEvent.setup>

export function resetStores(): void {
  useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true)
  useTabStore.setState(useTabStore.getInitialState(), true)
  useUiStore.setState(useUiStore.getInitialState(), true)
  useResponseStore.setState(useResponseStore.getInitialState(), true)
  useConsoleStore.setState(useConsoleStore.getInitialState(), true)
  useSessionVariables.setState(useSessionVariables.getInitialState(), true)
  useSuiteStore.setState(useSuiteStore.getInitialState(), true)
  services.suites = new MemorySuiteRepository()
}

export async function renderApp() {
  resetStores()
  const user = userEvent.setup()
  const utils = render(<App />)
  await screen.findByRole('treeitem', { name: /List users/ })
  return { user, ...utils }
}

/** Opens a section from the navigation rail, e.g. "Realtime" or "Network". */
export async function goTo(user: User, section: string) {
  await user.click(within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('button', { name: section }))
}

export async function openRequest(user: User, section: string, name: RegExp) {
  await goTo(user, section)
  await user.click(screen.getByRole('treeitem', { name }))
  return screen.getByRole('region', { name: /request$/ })
}

/** Uses the section's own menu ("New HTTP request", "New Kafka request"…). */
export async function createRequest(user: User, section: string, protocol: string) {
  await goTo(user, section)
  await user.click(screen.getByRole('button', { name: `New ${protocol} request` }))
  return screen.getByRole('region', { name: /request$/ })
}
