import { SendHorizontal } from 'lucide-react'
import { CodeEditor } from '@/components/CodeEditor'
import { Button } from '@/components/ui/button'
import type { BoundField } from '../use-field-binder'
import { useRequestActions, useStreamSession } from '../use-request-actions'

interface MessageComposerProps extends BoundField {
  requestId: string
  label?: string
  language?: string
}

export function MessageComposer({ requestId, value, label = 'Message', language, onChange }: MessageComposerProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        <CodeEditor ariaLabel={label} value={value} language={language} onChange={onChange} />
      </div>
      <ComposerFooter requestId={requestId} label={label} value={value} />
    </div>
  )
}

function ComposerFooter({ requestId, label, value }: { requestId: string; label: string; value: string }) {
  const connected = useStreamSession(requestId)?.connected ?? false
  const { publish } = useRequestActions(requestId)
  return (
    <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
      {!connected && <span className="text-xs text-muted-foreground">Connect to send</span>}
      <Button size="sm" variant="primary" disabled={!connected} onClick={() => publish(value)}>
        <SendHorizontal /> Send {label.toLowerCase()}
      </Button>
    </div>
  )
}
