import type { KeyboardEvent } from 'react'

export function renameKeyHandler(commit: () => void, cancel: () => void): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent): void => {
    event.stopPropagation()
    if (event.key === 'Enter') commit()
    if (event.key === 'Escape') cancel()
  }
}
