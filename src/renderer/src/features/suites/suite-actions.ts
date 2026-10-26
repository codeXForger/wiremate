import { useSuiteStore } from '@/stores/suite-store'
import { useTabStore } from '@/stores/tab-store'

export function renameSuite(id: string, name: string): void {
  useSuiteStore.getState().update(id, { name })
}

export function createAndOpenSuite(): void {
  useTabStore.getState().open(useSuiteStore.getState().create().id)
}
