import { create } from 'zustand'

/** Drop target key for the section root (top level of the collections tree). */
export const ROOT_TARGET = '__root__'

interface DragState {
  draggingId: string | null
  overTarget: string | null
  start: (id: string) => void
  hover: (target: string | null) => void
  end: () => void
}

/** dataTransfer is unreadable during dragover, so the dragged node lives here for the duration of a drag. */
export const useDragStore = create<DragState>()((set) => ({
  draggingId: null,
  overTarget: null,
  start: (id) => set({ draggingId: id, overTarget: null }),
  hover: (target) => set({ overTarget: target }),
  end: () => set({ draggingId: null, overTarget: null })
}))
