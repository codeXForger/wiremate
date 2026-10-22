import { describe, expect, it } from 'vitest'
import { closeTab, nextActiveAfterClose, openTab, retainTabs, withDirty, type TabData } from './tab-utils'

const data: TabData = { openIds: ['a', 'b', 'c'], activeId: 'b', dirtyIds: ['b'] }

describe('tab utils', () => {
  it('activates an existing tab without duplicating it', () => {
    expect(openTab(data, 'a')).toEqual({ openIds: ['a', 'b', 'c'], activeId: 'a' })
    expect(openTab(data, 'd').openIds).toEqual(['a', 'b', 'c', 'd'])
  })

  it('moves focus to the neighbour when the active tab closes', () => {
    expect(nextActiveAfterClose(data, 'b')).toBe('c')
    expect(nextActiveAfterClose({ ...data, activeId: 'c' }, 'c')).toBe('b')
    expect(nextActiveAfterClose(data, 'a')).toBe('b')
    expect(nextActiveAfterClose({ openIds: ['a'], activeId: 'a', dirtyIds: [] }, 'a')).toBeNull()
  })

  it('drops the closed tab from open and dirty lists', () => {
    expect(closeTab(data, 'b')).toEqual({ openIds: ['a', 'c'], activeId: 'c', dirtyIds: [] })
  })

  it('retains only valid tabs', () => {
    expect(retainTabs(data, new Set(['a', 'b']))).toEqual({ openIds: ['a', 'b'], activeId: 'b', dirtyIds: ['b'] })
    expect(retainTabs(data, new Set(['c']))).toEqual({ openIds: ['c'], activeId: 'c', dirtyIds: [] })
    expect(retainTabs(data, new Set())).toEqual({ openIds: [], activeId: null, dirtyIds: [] })
  })

  it('toggles dirty state', () => {
    expect(withDirty(data, 'a', true)).toEqual({ dirtyIds: ['b', 'a'] })
    expect(withDirty(data, 'b', true)).toEqual({ dirtyIds: ['b'] })
    expect(withDirty(data, 'b', false)).toEqual({ dirtyIds: [] })
  })
})
