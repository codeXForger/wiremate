import { create } from 'zustand'
import { closeTab, openTab, retainTabs, withDirty, type TabData } from './tab-utils'

interface TabState extends TabData {
  open: (id: string) => void
  close: (id: string) => void
  markDirty: (id: string) => void
  markClean: (id: string) => void
  retain: (validIds: Set<string>) => void
}

export const useTabStore = create<TabState>()((set, get) => ({
  openIds: [],
  activeId: null,
  dirtyIds: [],
  open: (id) => set(openTab(get(), id)),
  close: (id) => set(closeTab(get(), id)),
  markDirty: (id) => set(withDirty(get(), id, true)),
  markClean: (id) => set(withDirty(get(), id, false)),
  retain: (validIds) => set(retainTabs(get(), validIds))
}))
