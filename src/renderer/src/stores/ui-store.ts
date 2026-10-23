import { create } from 'zustand'
import type { CategoryId } from '@shared/protocols/categories'

export type UtilityView = 'environments' | 'history' | 'settings'
export type SidebarView = CategoryId | UtilityView
/** What a delete confirmation shows, and what runs when it is confirmed. */
export interface DeleteConfirmation {
  title: string
  message: string
  onConfirm: () => void
}

export type DialogState =
  | { type: 'create-workspace' }
  | { type: 'new-request'; parentId: string | null; category: CategoryId }
  | ({ type: 'confirm-delete' } & DeleteConfirmation)
  | null

interface UiState {
  view: SidebarView
  dialog: DialogState
  setView: (view: SidebarView) => void
  openDialog: (dialog: Exclude<DialogState, null>) => void
  closeDialog: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'api',
  dialog: null,
  setView: (view) => set({ view }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null })
}))
