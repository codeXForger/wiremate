import type { KeyboardEvent } from 'react'

/** What a selectable item (tree row, tab) does when activated or asked to rename itself. */
export interface ItemActions {
  activate: () => void
  rename: () => void
}

const KEY_ACTIONS: Record<string, keyof ItemActions> = { Enter: 'activate', F2: 'rename' }

/** Enter activates the item, F2 starts renaming it. */
export function itemKeyHandler(actions: ItemActions): (event: KeyboardEvent) => void {
  return (event) => {
    const action = KEY_ACTIONS[event.key]
    if (action) actions[action]()
  }
}
