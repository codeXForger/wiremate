import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import type { SavedMessage } from '@shared/types/message'
import { CodeEditor } from '@/components/CodeEditor'
import { Hint } from '@/components/Hint'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useMessageStore } from '@/stores/message-store'
import type { Bound } from '../request/use-field-binder'
import { describeSize, loadMessage } from './message-actions'

interface LoadMessageDialogProps {
  requestId: string
  onClose: () => void
}

function matches(message: SavedMessage, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return message.name.toLowerCase().includes(needle) || message.payload.toLowerCase().includes(needle)
}

/** The saved messages, searchable, with a preview of the one picked; loading puts it in the request's payload. */
export function LoadMessageDialog({ requestId, onClose }: LoadMessageDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[min(560px,calc(100vh-64px))] w-[min(880px,calc(100vw-32px))] flex-col">
        <DialogTitle>Load a message</DialogTitle>
        <DialogDescription>Pick a saved message to put in the payload, then send it.</DialogDescription>
        <SearchableMessages requestId={requestId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}

function SearchableMessages({ requestId, onClose }: LoadMessageDialogProps) {
  const [query, setQuery] = useState('')
  const messages = useMessageStore((state) => state.messages).filter((message) => matches(message, query))
  const load = (messageId: string): void => {
    loadMessage(requestId, messageId)
    onClose()
  }
  return (
    <>
      <SearchBox value={query} onChange={setQuery} />
      <MessageBrowser requestId={requestId} messages={messages} onLoad={load} />
    </>
  )
}

function SearchBox({ value, onChange }: Bound<string>) {
  const props = { 'aria-label': 'Search messages', placeholder: 'Search names and payloads', value }
  return <Input {...props} className="mt-3" onChange={(e) => onChange(e.target.value)} />
}

interface MessageBrowserProps {
  requestId: string
  messages: SavedMessage[]
  onLoad: (messageId: string) => void
}

function MessageBrowser({ requestId, messages, onLoad }: MessageBrowserProps) {
  const loadedId = useMessageStore((state) => state.loaded[requestId])
  const [pickedId, setPickedId] = useState(loadedId)
  const picked = messages.find((message) => message.id === pickedId) ?? messages[0]
  if (!picked)
    return <Hint className="mt-3">No saved messages match. Save one from a request with Save as message.</Hint>
  return (
    <div className="mt-3 flex min-h-0 flex-1 gap-3">
      <MessageChoices messages={messages} pickedId={picked.id} onPick={setPickedId} onLoad={onLoad} />
      <MessagePreview message={picked} onLoad={onLoad} />
    </div>
  )
}

interface MessageChoicesProps {
  messages: SavedMessage[]
  pickedId: string
  onPick: (messageId: string) => void
  onLoad: (messageId: string) => void
}

const CHOICE_CLASS = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface'

function MessageChoices({ messages, ...choice }: MessageChoicesProps) {
  return (
    <ul aria-label="Saved messages" className="w-64 shrink-0 overflow-auto rounded-md border p-1">
      {messages.map((message) => (
        <li key={message.id}>
          <MessageChoice message={message} {...choice} />
        </li>
      ))}
    </ul>
  )
}

/** Click picks it for the preview; double-click loads it straight away. */
function MessageChoice(props: Omit<MessageChoicesProps, 'messages'> & { message: SavedMessage }) {
  const { message, onPick, onLoad } = props
  const picked = message.id === props.pickedId
  const handlers = { onClick: () => onPick(message.id), onDoubleClick: () => onLoad(message.id) }
  return (
    <button type="button" aria-pressed={picked} className={cn(CHOICE_CLASS, picked && 'bg-surface')} {...handlers}>
      <span className="min-w-0 flex-1 truncate">{message.name}</span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{describeSize(message)}</span>
    </button>
  )
}

interface MessagePreviewProps {
  message: SavedMessage
  onLoad: (messageId: string) => void
}

function MessagePreview({ message, onLoad }: MessagePreviewProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border">
      <PreviewHeader message={message} onLoad={onLoad} />
      <div className="min-h-0 flex-1">
        <CodeEditor ariaLabel="Message preview" value={message.payload} language="plaintext" readOnly />
      </div>
    </div>
  )
}

function PreviewHeader({ message, onLoad }: MessagePreviewProps) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
      <span className="truncate font-medium text-foreground">{message.name}</span>
      <span>{message.encoding === 'hex' ? 'hex' : `text · ${message.lineEnding}`}</span>
      <Button size="sm" variant="primary" className="ml-auto" onClick={() => onLoad(message.id)}>
        <FolderOpen /> Load
      </Button>
    </div>
  )
}
