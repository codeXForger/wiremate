import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app/App'
import { demoSeed } from './seed'
import { useConsoleStore } from '@/stores/console-store'
import { useResponseStore } from '@/stores/response-store'
import { services } from '@/services'
import { MemorySuiteRepository } from '@/services/suite-repository'
import { MemoryWorkspaceRepository } from '@/services/workspace-repository'
import { useSessionVariables } from '@/stores/session-variables'
import { useSuiteStore } from '@/stores/suite-store'
import { saveQueue } from '@/stores/workspace-persistence'
import { useTabStore } from '@/stores/tab-store'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export type User = ReturnType<typeof userEvent.setup>

/** Long enough that nothing is written in the middle of a test; tests that check storage flush the queue. */
const TEST_SAVE_DELAY_MS = 60_000

/** Resets every store. With `keepStorage`, the workspace and suite storage survive, like files across a restart. */
export function resetStores({ keepStorage = false } = {}): void {
  useWorkspaceStore.setState(useWorkspaceStore.getInitialState(), true)
  useTabStore.setState(useTabStore.getInitialState(), true)
  useUiStore.setState(useUiStore.getInitialState(), true)
  useResponseStore.setState(useResponseStore.getInitialState(), true)
  useConsoleStore.setState(useConsoleStore.getInitialState(), true)
  useSessionVariables.setState(useSessionVariables.getInitialState(), true)
  useSuiteStore.setState(useSuiteStore.getInitialState(), true)
  saveQueue.clear()
  saveQueue.delayMs = TEST_SAVE_DELAY_MS
  if (keepStorage) return
  services.suites = new MemorySuiteRepository()
  services.workspaces = new MemoryWorkspaceRepository([demoSeed()])
}

export async function renderApp(options: { keepStorage?: boolean } = {}) {
  resetStores(options)
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
