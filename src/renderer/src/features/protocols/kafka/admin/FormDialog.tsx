import { useState, type ReactNode, type SyntheticEvent } from 'react'
import { errorMessage } from '@shared/scripting/describe'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Bound } from '../../../request/use-field-binder'

/** What a dialog says: its title, the line under it, and its submit button. */
export interface DialogCopy {
  title: string
  description: string
  submitLabel: string
}

interface FormDialogProps extends DialogCopy {
  /** Resolves to true when the dialog may close; a throw (or rejection) shows its message in the dialog. */
  onSubmit: () => Promise<boolean>
  onClose: () => void
  children: ReactNode
}

/** A small form in a dialog, for the admin actions that need a few values. */
export function FormDialog({ title, description, onClose, ...form }: FormDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(460px,calc(100vw-32px))]">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogForm onClose={onClose} {...form} />
      </DialogContent>
    </Dialog>
  )
}

type DialogFormProps = Omit<FormDialogProps, 'title' | 'description'>

/** Submits through `onSubmit`; closes when it says so, or keeps the dialog open with the error. */
function useSubmit({ onSubmit, onClose }: Pick<DialogFormProps, 'onSubmit' | 'onClose'>) {
  const [error, setError] = useState<string | null>(null)
  const submit = (event: SyntheticEvent): void => {
    event.preventDefault()
    Promise.resolve()
      .then(onSubmit)
      .then((done) => done && onClose())
      .catch((failure: unknown) => setError(errorMessage(failure)))
  }
  return { error, submit }
}

function DialogForm({ submitLabel, children, ...actions }: DialogFormProps) {
  const { error, submit } = useSubmit(actions)
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
      {children}
      <FormFooter error={error} submitLabel={submitLabel} />
    </form>
  )
}

function FormFooter({ error, submitLabel }: { error: string | null; submitLabel: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" className="self-end">
        {submitLabel}
      </Button>
    </>
  )
}

interface FormFieldProps extends Bound<string> {
  id: string
  label: string
  placeholder?: string
  autoFocus?: boolean
}

export function FormField({ id, label, value, onChange, ...input }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} {...input} />
    </div>
  )
}
