import { create } from 'zustand'

/** Drop target key for the section root (top level of the collections tree). */
export const ROOT_TARGET = '__root__'

/** Where a drop lands relative to the row under the pointer. */
export type DropPosition = 'before' | 'inside' | 'after'

interface DragState {
  draggingId: string | null
  overTarget: string | null
  position: DropPosition | null
  start: (id: string) => void
  hover: (target: string | null, position?: DropPosition) => void
  end: () => void
}

/** dataTransfer is unreadable during dragover, so the dragged node lives here for the duration of a drag. */
export const useDragStore = create<DragState>()((set) => ({
  draggingId: null,
  overTarget: null,
  position: null,
  start: (id) => set({ draggingId: id, overTarget: null, position: null }),
  hover: (target, position = 'inside') => set({ overTarget: target, position: target === null ? null : position }),
  end: () => set({ draggingId: null, overTarget: null, position: null })
}))
