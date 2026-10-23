import { create } from 'zustand'
import type { ConsoleEntry } from '@shared/types/scripting'

export const CONSOLE_LIMIT = 1000

interface ConsoleState {
  entries: ConsoleEntry[]
  open: boolean
  append: (entries: ConsoleEntry[]) => void
  clear: () => void
  toggle: () => void
}

export const useConsoleStore = create<ConsoleState>()((set, get) => ({
  entries: [],
  open: false,
  append: (entries) => set({ entries: [...get().entries, ...entries].slice(-CONSOLE_LIMIT) }),
  clear: () => set({ entries: [] }),
  toggle: () => set({ open: !get().open })
}))
