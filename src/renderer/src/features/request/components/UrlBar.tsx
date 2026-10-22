import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import type { BoundField } from '../use-field-binder'

interface UrlBarProps extends BoundField {
  label: string
  placeholder?: string
  leading?: ReactNode
  action: ReactNode
}

export function UrlBar({ value, label, placeholder, leading, action, onChange }: UrlBarProps) {
  return (
    <div className="flex items-center gap-2 border-b p-3">
      {leading}
      <Input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        className="font-mono text-xs"
        onChange={(event) => onChange(event.target.value)}
      />
      {action}
    </div>
  )
}
