import { Input } from '@/components/ui/input'
import type { BoundField } from '../use-field-binder'
import { Field } from './Field'

interface TextFieldProps extends BoundField {
  id: string
  label: string
  type?: 'text' | 'password'
  placeholder?: string
}

export function TextField({ id, label, value, type = 'text', placeholder, onChange }: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id}>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}
