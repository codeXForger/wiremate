import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface OptionSelectProps<T extends string> {
  label: string
  value: T
  options: readonly T[]
  className?: string
  format?: (option: T) => string
  onChange: (value: T) => void
}

export function OptionSelect<T extends string>({ label, value, className, onChange, ...rest }: OptionSelectProps<T>) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <OptionList options={rest.options} format={rest.format ?? String} />
    </Select>
  )
}

function OptionList<T extends string>({ options, format }: { options: readonly T[]; format: (option: T) => string }) {
  return (
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option} value={option}>
          {format(option)}
        </SelectItem>
      ))}
    </SelectContent>
  )
}
