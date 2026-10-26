import { Plus, X } from 'lucide-react'
import type { KeyValue } from '@shared/types/protocol'
import { createKeyValue, removeKeyValue, updateKeyValue } from '@shared/utils/key-value'
import { Button } from '@/components/ui/button'
import { VariableInput } from '@/features/variables/VariableInput'
import { cn } from '@/lib/utils'
import type { Bound } from '../use-field-binder'

interface KeyValueTableProps extends Bound<KeyValue[]> {
  label: string
  /** Colour `{{variables}}` in keys and values. Off for the environment editor, which defines them. */
  highlightVariables?: boolean
}

const CELL_CLASS =
  'h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 font-mono text-xs outline-none hover:border-border focus:border-ring'

export function KeyValueTable({ label, value: rows, onChange, highlightVariables = true }: KeyValueTableProps) {
  const add = (): void => onChange([...rows, createKeyValue()])
  return (
    <div className="flex flex-col gap-1 p-3">
      {rows.map((row) => (
        <KeyValueRow key={row.id} {...{ label, row, onChange, highlightVariables }} value={rows} />
      ))}
      <Button variant="ghost" size="sm" className="self-start" onClick={add}>
        <Plus /> Add {label.toLowerCase()}
      </Button>
    </div>
  )
}

type RowProps = KeyValueTableProps & { row: KeyValue }

function KeyValueRow({ label, row, value: rows, onChange, highlightVariables: highlight = true }: RowProps) {
  const patch = (change: Partial<KeyValue>): void => onChange(updateKeyValue(rows, row.id, change))
  const name = row.key || label
  return (
    <div className="flex items-center gap-2">
      <EnabledToggle name={name} checked={row.enabled} onChange={(enabled) => patch({ enabled })} />
      <CellInput label="Key" highlight={highlight} value={row.key} onChange={(key) => patch({ key })} />
      <CellInput label="Value" highlight={highlight} value={row.value} onChange={(value) => patch({ value })} />
      <RemoveButton name={name} onRemove={() => onChange(removeKeyValue(rows, row.id))} />
    </div>
  )
}

interface EnabledToggleProps {
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function EnabledToggle({ name, checked, onChange }: EnabledToggleProps) {
  const label = `Enable ${name}`
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-primary"
    />
  )
}

interface CellInputProps extends Bound<string> {
  label: string
  highlight: boolean
}

function CellInput({ label, value, onChange, highlight }: CellInputProps) {
  const shared = { 'aria-label': label, placeholder: label, value }
  if (!highlight) return <input {...shared} onChange={(e) => onChange(e.target.value)} className={CELL_CLASS} />
  return <VariableInput {...shared} onValueChange={onChange} className={cn(CELL_CLASS, 'w-full')} />
}

function RemoveButton({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label={`Remove ${name}`} onClick={onRemove}>
      <X />
    </Button>
  )
}
