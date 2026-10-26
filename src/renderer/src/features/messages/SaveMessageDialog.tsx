import { useState, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Bound } from '../request/use-field-binder'
import { saveAsMessage } from './message-actions'

interface SaveMessageDialogProps {
  requestId: string
  onClose: () => void
}

/** Names the request's payload and saves it at the end of the message list. */
export function SaveMessageDialog({ requestId, onClose }: SaveMessageDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(420px,calc(100vw-32px))]">
        <DialogTitle>Save as message</DialogTitle>
        <DialogDescription>Any TCP or UDP request in this workspace can load it.</DialogDescription>
        <SaveForm requestId={requestId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}

function SaveForm({ requestId, onClose }: SaveMessageDialogProps) {
  const [name, setName] = useState('')
  const save = (event: SyntheticEvent): void => {
    event.preventDefault()
    ;[() => saveAsMessage(requestId, name), onClose].forEach((step) => step())
  }
  return (
    <form onSubmit={save} className="mt-4 flex flex-col gap-1.5">
      <NameField value={name} onChange={setName} />
      <Button type="submit" variant="primary" className="mt-4 self-end">
        Save
      </Button>
    </form>
  )
}

function NameField({ value, onChange }: Bound<string>) {
  return (
    <>
      <Label htmlFor="message-name">Name</Label>
      <Input
        id="message-name"
        autoFocus
        value={value}
        placeholder="Message N"
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  )
}
