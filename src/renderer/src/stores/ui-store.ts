import { create } from 'zustand'
import type { CategoryId } from '@shared/protocols/categories'

export type UtilityView = 'environments' | 'settings'
export type SidebarView = CategoryId | UtilityView
/** What a delete confirmation shows, and what runs when it is confirmed. */
export interface DeleteConfirmation {
  title: string
  message: string
  onConfirm: () => void
  /** The confirm button; "Delete" by default. */
  confirmLabel?: string
  /** Follows the message; "This cannot be undone." by default. */
  note?: string
}

export type DialogState =
  | { type: 'create-workspace' }
  | { type: 'new-request'; parentId: string | null; category: CategoryId }
  | ({ type: 'confirm-delete' } & DeleteConfirmation)
  | { type: 'load-message'; requestId: string }
  | { type: 'save-message'; requestId: string }
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
