export interface TabData {
  openIds: string[]
  activeId: string | null
  dirtyIds: string[]
}

export function nextActiveAfterClose(data: TabData, closingId: string): string | null {
  if (data.activeId !== closingId) return data.activeId
  const index = data.openIds.indexOf(closingId)
  const remaining = data.openIds.filter((id) => id !== closingId)
  return remaining[Math.min(index, remaining.length - 1)] ?? null
}

export function openTab(data: TabData, id: string): Partial<TabData> {
  return { openIds: data.openIds.includes(id) ? data.openIds : [...data.openIds, id], activeId: id }
}

export function closeTab(data: TabData, id: string): TabData {
  const without = (ids: string[]): string[] => ids.filter((other) => other !== id)
  return {
    openIds: without(data.openIds),
    activeId: nextActiveAfterClose(data, id),
    dirtyIds: without(data.dirtyIds)
  }
}

export function retainTabs(data: TabData, validIds: Set<string>): TabData {
  const openIds = data.openIds.filter((id) => validIds.has(id))
  const activeId = data.activeId && validIds.has(data.activeId) ? data.activeId : (openIds[0] ?? null)
  return { openIds, activeId, dirtyIds: data.dirtyIds.filter((id) => validIds.has(id)) }
}

export function withDirty(data: TabData, id: string, dirty: boolean): Partial<TabData> {
  const others = data.dirtyIds.filter((other) => other !== id)
  return { dirtyIds: dirty ? [...others, id] : others }
}
