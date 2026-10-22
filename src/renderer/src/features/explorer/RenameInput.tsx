import { useState, type ChangeEvent } from 'react'
import type { TreeNode } from '@shared/types/workspace'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { renameKeyHandler } from './rename-keys'

const INPUT_CLASS = 'h-5 min-w-0 flex-1 rounded border border-ring bg-surface px-1 outline-none'

interface RenameInputProps {
  node: TreeNode
  onDone: () => void
}

function useRename({ node, onDone }: RenameInputProps) {
  const [value, setValue] = useState(node.name)
  const commit = (): void => {
    if (value.trim()) useWorkspaceStore.getState().renameNode(node.id, value.trim())
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
