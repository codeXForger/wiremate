import { useState } from 'react'
import { Search } from 'lucide-react'
import type { TreeNode } from '@shared/types/workspace'
import { Hint } from '@/components/Hint'
import { ItemName } from '@/components/ItemName'
import { RequestBadge } from '@/components/RequestBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { isCovered, pickerChanges, pickerRows, toggleSelection, type PickerChanges } from './item-picker'
import { KindIcon } from './KindIcon'
import type { AddableNode } from './suite-items'

interface SuiteItemsDialogProps {
  /** Node ids in the suite when the dialog opens; they start ticked. */
  inSuite: Set<string>
  onSave: (changes: PickerChanges) => void
  onClose: () => void
}

const CONTENT_CLASS = 'flex max-h-[80vh] w-[min(560px,calc(100vw-32px))] flex-col'

const DESCRIPTION = 'Tick what the suite runs, untick what it should not. A ticked folder runs every request inside it.'

/** Chooses which folders and requests of the API section a suite runs: search, tick or untick, save. */
export function SuiteItemsDialog(props: SuiteItemsDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className={CONTENT_CLASS}>
        <DialogTitle>Suite requests</DialogTitle>
        <DialogDescription>{DESCRIPTION}</DialogDescription>
        <PickerBody {...props} />
      </DialogContent>
    </Dialog>
  )
}

function PickerBody({ inSuite, onSave, onClose }: SuiteItemsDialogProps) {
  const picker = usePicker(inSuite)
  const save = (): void => {
    onSave(picker.changes)
    onClose()
  }
  return (
    <>
      <SearchBox value={picker.query} onChange={picker.setQuery} />
      <PickerList picker={picker} />
      <PickerFooter changes={picker.changes} onSave={save} />
    </>
  )
}

function usePicker(initial: Set<string>) {
  const nodes = useWorkspaceStore((state) => state.nodes)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial))
  const toggle = (id: string): void => setSelected(toggleSelection(nodes, selected, id))
  const covered = (id: string): boolean => isCovered(nodes, selected, id)
  const changes = pickerChanges(nodes, initial, selected)
  return { query, setQuery, rows: pickerRows(nodes, query), selected, toggle, covered, changes }
}

type Picker = ReturnType<typeof usePicker>

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative mt-4">
      <Search aria-hidden className="absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
      <Input
        autoFocus
        aria-label="Search requests and folders"
        placeholder="Search requests and folders"
        className="pl-8"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function PickerList({ picker }: { picker: Picker }) {
  if (picker.rows.length === 0) {
    return <Hint>{picker.query ? 'Nothing matches the search.' : 'The API section has no requests yet.'}</Hint>
  }
  return (
    <ul aria-label="Requests and folders" className="mt-2 min-h-40 flex-1 overflow-auto rounded-md border p-1">
      {picker.rows.map((row) => (
        <PickerRow key={row.node.id} row={row} picker={picker} />
      ))}
    </ul>
  )
}

const ROW_CLASS = 'flex h-8 cursor-pointer items-center gap-2 rounded pr-2 text-[13px] hover:bg-surface'

function PickerRow({ row, picker }: { row: AddableNode; picker: Picker }) {
  const { node, depth } = row
  const covered = picker.covered(node.id)
  const className = cn(ROW_CLASS, covered && 'cursor-default opacity-60')
  return (
    <li>
      <label className={className} style={{ paddingLeft: 8 + depth * 16 }}>
        <PickerCheckbox node={node} picker={picker} covered={covered} />
        <NodeIcon node={node} />
        <ItemName name={node.name} />
      </label>
    </li>
  )
}

/** A folder's ticked box covers what is inside it: those show ticked and cannot be ticked on their own. */
function PickerCheckbox({ node, picker, covered }: { node: TreeNode; picker: Picker; covered: boolean }) {
  const checked = covered || picker.selected.has(node.id)
  const toggle = (): void => picker.toggle(node.id)
  return (
    <input
      type="checkbox"
      aria-label={node.name}
      className="accent-primary"
      checked={checked}
      disabled={covered}
      onChange={toggle}
    />
  )
}

function NodeIcon({ node }: { node: TreeNode }) {
  if (!node.protocol) return <KindIcon kind="folder" />
  return <RequestBadge requestId={node.id} protocol={node.protocol} className="w-auto" />
}

function describeChanges({ added, removed }: PickerChanges): string {
  const parts = [added.length > 0 && `${added.length} to add`, removed.length > 0 && `${removed.length} to remove`]
  return parts.filter(Boolean).join(' · ') || 'No changes'
}

function PickerFooter({ changes, onSave }: { changes: PickerChanges; onSave: () => void }) {
  const changed = changes.added.length + changes.removed.length > 0
  return (
    <div className="mt-4 flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{describeChanges(changes)}</span>
      <DialogClose asChild>
        <Button className="ml-auto">Cancel</Button>
      </DialogClose>
      <Button variant="primary" disabled={!changed} onClick={onSave}>
        Save
      </Button>
    </div>
  )
}
