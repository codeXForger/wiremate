import { ChevronRight, FolderOpen, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMessageStore } from '@/stores/message-store'
import { loadMessage, openLoadDialog, openSaveDialog } from './message-actions'

/** Above a socket payload: load a saved message, save this one, and step through the list in order. */
export function MessageBar({ requestId }: { requestId: string }) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-1.5">
      <Button size="sm" variant="ghost" onClick={() => openLoadDialog(requestId)}>
        <FolderOpen /> Load message
      </Button>
      <Button size="sm" variant="ghost" onClick={() => openSaveDialog(requestId)}>
        <Save /> Save as message
      </Button>
      <LoadedMessage requestId={requestId} />
    </div>
  )
}

/** Which saved message is in the payload, and a button to load the one after it. */
function LoadedMessage({ requestId }: { requestId: string }) {
  const messages = useMessageStore((state) => state.messages)
  const loadedId = useMessageStore((state) => state.loaded[requestId])
  const index = messages.findIndex((message) => message.id === loadedId)
  const current = messages[index]
  if (!current) return null
  const next = messages[index + 1]
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="truncate">{`Loaded "${current.name}" · ${index + 1} of ${messages.length}`}</span>
      <NextButton disabled={!next} onClick={() => next && loadMessage(requestId, next.id)} />
    </div>
  )
}

function NextButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant="secondary" aria-label="Load next message" disabled={disabled} onClick={onClick}>
      Next <ChevronRight />
    </Button>
  )
}
