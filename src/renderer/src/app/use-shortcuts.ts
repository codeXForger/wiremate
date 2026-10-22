import { useEffect } from 'react'
import { currentCategory, startNewRequest } from '@/features/request/new-request'
import { useTabStore } from '@/stores/tab-store'

type ShortcutHandler = () => void

const SHORTCUTS: Record<string, ShortcutHandler> = {
  n: () => startNewRequest(null, currentCategory()),
  s: () => {
    const { activeId, markClean } = useTabStore.getState()
    if (activeId) markClean(activeId)
  },
  w: () => {
    const { activeId, close } = useTabStore.getState()
    if (activeId) close(activeId)
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
