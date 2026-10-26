import { useState, type ChangeEvent } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { renameKeyHandler } from './rename-keys'

const INPUT_CLASS = 'h-5 min-w-0 flex-1 rounded border border-ring bg-surface px-1 outline-none'

/** Anything with an id and a name in the workspace tree: a collection, a folder or a request. */
export interface Renameable {
  id: string
  name: string
}

interface RenameInputProps {
  target: Renameable
  onDone: () => void
  /** Saves the new name. Defaults to renaming a node of the workspace tree. */
  onRename?: (id: string, name: string) => void
}

const renameNode = (id: string, name: string): void => useWorkspaceStore.getState().renameNode(id, name)

function useRename({ target, onDone, onRename = renameNode }: RenameInputProps) {
  const [value, setValue] = useState(target.name)
  const commit = (): void => {
    if (value.trim()) onRename(target.id, value.trim())
    onDone()
  }
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => setValue(event.target.value)
  return { value, onChange, onBlur: commit, onKeyDown: renameKeyHandler(commit, onDone) }
}

export function RenameInput(props: RenameInputProps) {
  const inputProps = useRename(props)
  return (
    <input aria-label="Name" autoFocus className={INPUT_CLASS} onClick={(e) => e.stopPropagation()} {...inputProps} />
  )
}
