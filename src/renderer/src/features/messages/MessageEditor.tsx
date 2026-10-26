import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { SavedMessage } from '@shared/types/message'
import type { LineEnding, PayloadEncoding } from '@shared/types/protocol'
import { CodeEditor } from '@/components/CodeEditor'
import { Column } from '@/components/Column'
import { IconButton } from '@/components/IconButton'
import { useMessageStore } from '@/stores/message-store'
import { PayloadFormat } from '../protocols/socket/PayloadFormat'
import type { Bound } from '../request/use-field-binder'
import { askToDeleteMessage, describeSize } from './message-actions'

/** A saved message in its own tab: its payload, how it is encoded, and where it sits in the list. */
export function MessageEditor({ messageId }: { messageId: string }) {
  const message = useMessageStore((state) => state.messages.find((candidate) => candidate.id === messageId))
  if (!message) return null
  return (
    <Column aria-label={`${message.name} message`} role="region">
      <MessageHeader message={message} />
      <PayloadEditor message={message} />
    </Column>
  )
}

function PayloadEditor({ message }: { message: SavedMessage }) {
  const update = (payload: string): void => useMessageStore.getState().update(message.id, { payload })
  return (
    <div className="min-h-0 flex-1">
      <CodeEditor
        ariaLabel="Message payload"
        value={message.payload}
        language="plaintext"
        onChange={update}
        highlightVariables
      />
    </div>
  )
}

function bind<K extends 'encoding' | 'lineEnding'>(message: SavedMessage, key: K): Bound<SavedMessage[K]> {
  return { value: message[key], onChange: (value) => useMessageStore.getState().update(message.id, { [key]: value }) }
}

function MessageHeader({ message }: { message: SavedMessage }) {
  const encoding: Bound<PayloadEncoding> = bind(message, 'encoding')
  const lineEnding: Bound<LineEnding> = bind(message, 'lineEnding')
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <h2 className="mr-2 truncate text-sm font-semibold">{message.name}</h2>
      <PayloadFormat encoding={encoding} lineEnding={lineEnding} />
      <span className="font-mono text-xs text-muted-foreground">{describeSize(message)}</span>
      <OrderControls message={message} />
    </div>
  )
}

function OrderControls({ message }: { message: SavedMessage }) {
  const messages = useMessageStore((state) => state.messages)
  const index = messages.findIndex((candidate) => candidate.id === message.id)
  const move = (offset: -1 | 1): void => useMessageStore.getState().move(message.id, offset)
  return (
    <div className="ml-auto flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{`${index + 1} of ${messages.length}`}</span>
      <IconButton label="Move up" icon={ArrowUp} disabled={index === 0} onClick={() => move(-1)} />
      <IconButton label="Move down" icon={ArrowDown} disabled={index === messages.length - 1} onClick={() => move(1)} />
      <IconButton label="Delete message" icon={Trash2} onClick={() => askToDeleteMessage(message)} />
    </div>
  )
}
