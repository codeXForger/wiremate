import { create } from 'zustand'
import type { CategoryId } from '@shared/protocols/categories'

export type UtilityView = 'suites' | 'environments' | 'history' | 'settings'
export type SidebarView = CategoryId | UtilityView
export type Theme = 'dark' | 'light'
export type DialogState =
  { type: 'create-workspace' } | { type: 'new-request'; parentId: string | null; category: CategoryId } | null

interface UiState {
  view: SidebarView
  theme: Theme
  dialog: DialogState
  setView: (view: SidebarView) => void
  setTheme: (theme: Theme) => void
  openDialog: (dialog: Exclude<DialogState, null>) => void
  closeDialog: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'api',
  theme: 'dark',
  dialog: null,
  setView: (view) => set({ view }),
  setTheme: (theme) => set({ theme }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null })
}))
