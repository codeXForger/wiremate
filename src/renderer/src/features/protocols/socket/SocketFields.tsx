import { parseWholeNumber } from '@shared/utils/payload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Field } from '../../request/components/Field'
import type { Bound } from '../../request/use-field-binder'

const MAX_PORT = 65_535
const MAX_NUMBER = 2 ** 31 - 1

interface NumberInputProps extends Bound<number> {
  label: string
  id?: string
  max?: number
  /** Shown when the value is 0, e.g. "any" or "off". */
  zero?: string
  className?: string
}

/** A whole-number input; 0 shows as empty with the `zero` placeholder. */
export function NumberInput({ label, id, value, max = MAX_NUMBER, zero, className, onChange }: NumberInputProps) {
  return (
    <Input
      id={id}
      aria-label={id ? undefined : label}
      inputMode="numeric"
      className={className}
      value={value === 0 ? '' : String(value)}
      placeholder={zero ?? '0'}
      onChange={(e) => onChange(parseWholeNumber(e.target.value, max))}
    />
  )
}

export function PortInput(props: Omit<NumberInputProps, 'max'>) {
  return <NumberInput max={MAX_PORT} className="w-24 font-mono text-xs" {...props} />
}

export function NumberField(props: NumberInputProps & { id: string; port?: boolean }) {
  const { port, ...input } = props
  return (
    <Field label={props.label} htmlFor={props.id}>
      <NumberInput max={port ? MAX_PORT : MAX_NUMBER} {...input} />
    </Field>
  )
}

export function SwitchField({ id, label, value, onChange }: Bound<boolean> & { id: string; label: string }) {
  return (
    <div className="flex items-end gap-2 pb-2">
      <Switch id={id} checked={value} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}
