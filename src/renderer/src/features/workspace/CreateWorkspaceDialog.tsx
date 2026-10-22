import type { ChangeEvent, SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '../request/components/Field'
import { useWorkspaceForm, type WorkspaceForm } from './use-workspace-form'

interface CreateWorkspaceDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateWorkspaceDialog({ open, onClose }: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogTitle>New workspace</DialogTitle>
        <DialogDescription>
          A workspace is a folder on disk. Requests and environments are saved there as plain files you can commit.
        </DialogDescription>
        {open && <WorkspaceFormBody onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function WorkspaceFormBody({ onClose }: { onClose: () => void }) {
  const form = useWorkspaceForm()
  const onSubmit = (event: SyntheticEvent): void => {
    event.preventDefault()
    void form.submit().then((created) => created && onClose())
  }
  return (
    <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
      <NameField form={form} />
      <FolderField form={form} />
      <FormActions />
    </form>
  )
}

function NameField({ form }: { form: WorkspaceForm }) {
  return (
    <Field label="Name" htmlFor="ws-name">
      <Input id="ws-name" autoFocus value={form.values.name} onChange={(e) => form.setField('name', e.target.value)} />
      <FieldError message={form.errors.name} />
    </Field>
  )
}

function FolderField({ form }: { form: WorkspaceForm }) {
  return (
    <Field label="Folder" htmlFor="ws-path">
      <div className="flex gap-2">
        <PathInput form={form} />
        <Button type="button" onClick={() => void form.browse()}>
          Browse…
        </Button>
      </div>
      <FieldError message={form.errors.path} />
    </Field>
  )
}

function PathInput({ form }: { form: WorkspaceForm }) {
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => form.setField('path', event.target.value)
  const placeholder = '/Users/you/wiremate/my-api'
  return (
    <Input
      id="ws-path"
      className="font-mono text-xs"
      placeholder={placeholder}
      value={form.values.path}
      onChange={onChange}
    />
  )
}

function FormActions() {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <DialogClose asChild>
        <Button type="button" variant="ghost">
          Cancel
        </Button>
      </DialogClose>
      <Button type="submit" variant="primary">
        Create workspace
      </Button>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  ) : null
}
