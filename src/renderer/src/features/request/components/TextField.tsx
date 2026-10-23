import { inputClass } from '@/components/ui/input'
import { VariableInput } from '@/features/variables/VariableInput'
import type { BoundField } from '../use-field-binder'
import { Field } from './Field'

interface TextFieldProps extends BoundField {
  id: string
  label: string
  type?: 'text' | 'password'
  placeholder?: string
}

/** A labelled field whose `{{variables}}` are coloured and can be edited in place. */
export function TextField({ id, label, value, type = 'text', placeholder, onChange }: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id}>
      <VariableInput
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        className={inputClass}
        containerClassName="w-full flex-none"
        onValueChange={onChange}
      />
    </Field>
  )
}
