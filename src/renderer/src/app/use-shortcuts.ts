import { useEffect } from 'react'
import { currentCategory, duplicateAndOpen, startNewRequest } from '@/features/request/new-request'
import { requestCloseTab } from '@/features/tabs/close-tab'
import { useConsoleStore } from '@/stores/console-store'
import { useTabStore } from '@/stores/tab-store'
import { saveQueue } from '@/stores/workspace-persistence'
import { useWorkspaceStore } from '@/stores/workspace-store'

type ShortcutHandler = () => void

const SHORTCUTS: Record<string, ShortcutHandler> = {
  n: () => startNewRequest(null, currentCategory()),
  s: () => {
    const { activeId } = useTabStore.getState()
    if (activeId) useWorkspaceStore.getState().saveDraft(activeId, '')
    void saveQueue.flush()
  },
  '`': () => useConsoleStore.getState().toggle(),
  d: () => {
    const { activeId } = useTabStore.getState()
    if (activeId) duplicateAndOpen(activeId)
  },
  w: () => {
    const { activeId } = useTabStore.getState()
    if (activeId) requestCloseTab(activeId)
  }
}

export function handleShortcut(event: KeyboardEvent): void {
  const handler = event.metaKey || event.ctrlKey ? SHORTCUTS[event.key.toLowerCase()] : undefined
  if (!handler) return
  event.preventDefault()
  handler()
}

export function useShortcuts(): void {
  useEffect(() => {
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])
}
