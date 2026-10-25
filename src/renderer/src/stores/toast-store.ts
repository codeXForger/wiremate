import { create } from 'zustand'
import { createId } from '@shared/utils/id'

export type ToastTone = 'success' | 'error'

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  detail?: string
}

/** How long a toast stays: errors a little longer, since they need reading. */
export const TOAST_DURATION_MS: Record<ToastTone, number> = { success: 5000, error: 8000 }

interface ToastState {
  toasts: Toast[]
  show: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

/** Short messages that confirm or report something and go away by themselves. */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (toast) => {
    const id = createId('toast')
    set({ toasts: [...get().toasts, { ...toast, id }] })
    setTimeout(() => get().dismiss(id), TOAST_DURATION_MS[toast.tone])
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) })
}))
