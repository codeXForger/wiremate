import { useState, type ReactNode } from 'react'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DialogButtonProps {
  label: string
  icon: LucideIcon
  destructive?: boolean
  dialog: (close: () => void) => ReactNode
}

/** A button that opens a dialog; the dialog gets a function that closes it. */
export function DialogButton({ label, icon: Icon, destructive, dialog }: DialogButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant={destructive ? 'destructive' : 'secondary'} onClick={() => setOpen(true)}>
        <Icon /> {label}
      </Button>
      {open && dialog(() => setOpen(false))}
    </>
  )
}

/** A row's icon button that opens a dialog, e.g. "Edit retention.ms". */
export function IconDialogButton({ label, icon, dialog }: Omit<DialogButtonProps, 'destructive'>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton label={label} icon={icon} onClick={() => setOpen(true)} />
      {open && dialog(() => setOpen(false))}
    </>
  )
}

interface ListToolbarProps {
  label: string
  filter: string
  onFilter: (filter: string) => void
  children?: ReactNode
}

const FILTER_CLASS = 'h-7 max-w-64 text-xs'

/** The bar above a list: a filter, and controls such as "New topic". */
export function ListToolbar({ label, filter, onFilter, children }: ListToolbarProps) {
  const change = (value: string): void => onFilter(value)
  const input = { 'aria-label': label, placeholder: label, value: filter, className: FILTER_CLASS }
  return (
    <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2">
      <Input {...input} onChange={(e) => change(e.target.value)} />
      <span className="ml-auto" />
      {children}
    </div>
  )
}

interface DetailHeaderProps {
  back: string
  title: string
  onBack: () => void
  children?: ReactNode
}

/** The bar above a topic or group: the way back to the list, its name, and what can be done to it. */
export function DetailHeader({ back, title, onBack, children }: DetailHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
      <Button size="sm" variant="ghost" onClick={onBack}>
        <ArrowLeft /> {back}
      </Button>
      <h3 className="truncate font-mono text-xs font-semibold">{title}</h3>
      <span className="ml-auto" />
      {children}
    </div>
  )
}

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
}

/** A titled block of a detail view. */
export function Section({ title, action, children }: SectionProps) {
  return (
    <section aria-label={title} className="border-b">
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
        <span className="ml-auto" />
        {action}
      </div>
      {children}
    </section>
  )
}
