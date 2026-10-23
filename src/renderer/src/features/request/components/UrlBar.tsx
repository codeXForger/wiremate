import type { ReactNode } from 'react'
import { inputClass } from '@/components/ui/input'
import { VariableInput } from '@/features/variables/VariableInput'
import { cn } from '@/lib/utils'
import type { BoundField } from '../use-field-binder'

interface UrlBarProps extends BoundField {
  label: string
  placeholder?: string
  leading?: ReactNode
  action: ReactNode
}

const URL_CLASS = cn(inputClass, 'font-mono text-xs')

export function UrlBar({ value, label, placeholder, leading, action, onChange }: UrlBarProps) {
  return (
    <div className="flex items-center gap-2 border-b p-3">
      {leading}
      <VariableInput
        aria-label={label}
        value={value}
        placeholder={placeholder}
        className={URL_CLASS}
        onValueChange={onChange}
      />
      {action}
    </div>
  )
}
