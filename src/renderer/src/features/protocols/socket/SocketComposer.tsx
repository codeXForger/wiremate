import { useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import type { LineEnding, PayloadEncoding } from '@shared/types/protocol'
import { Button } from '@/components/ui/button'
import { MessageComposer } from '../../request/components/MessageComposer'
import { OptionSelect } from '../../request/components/OptionSelect'
import { useConfigBinder, useFieldBinder } from '../../request/use-field-binder'
import { useStreamSession } from '../../request/use-request-actions'
import { PayloadFormat } from './PayloadFormat'
import { useSocketActions } from './socket-actions'

/** The "send to" choice that means the default target: the destination, or every client. */
const DEFAULT_TARGET = '*'

interface SocketComposerProps {
  requestId: string
  /** Names the default target, e.g. "All clients". */
  defaultTarget: string
}

/** The payload editor, with its format and where to send it. */
export function SocketComposer({ requestId, defaultTarget }: SocketComposerProps) {
  const payload = useFieldBinder<'tcp'>(requestId)('payload')
  const footer = <SendBar requestId={requestId} defaultTarget={defaultTarget} />
  return <MessageComposer requestId={requestId} label="Payload" language="plaintext" footer={footer} {...payload} />
}

function SendBar({ requestId, defaultTarget }: SocketComposerProps) {
  const session = useStreamSession(requestId)
  const [target, setTarget] = useTarget(session?.peers ?? [])
  const { send } = useSocketActions(requestId)
  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
      <RequestPayloadFormat requestId={requestId} />
      <TargetSelect peers={session?.peers ?? []} defaultTarget={defaultTarget} value={target} onChange={setTarget} />
      <SendButton live={session?.connected ?? false} onSend={() => send(target)} />
    </div>
  )
}

function SendButton({ live, onSend }: { live: boolean; onSend: () => void }) {
  return (
    <>
      {!live && <span className="ml-auto text-xs text-muted-foreground">Open the socket to send</span>}
      <Button size="sm" variant="primary" className="ml-auto" disabled={!live} onClick={onSend}>
        <SendHorizontal /> Send
      </Button>
    </>
  )
}

/** The picked peer, until it goes away; undefined means the default target. */
function useTarget(peers: string[]): [string | undefined, (target: string) => void] {
  const [picked, setPicked] = useState(DEFAULT_TARGET)
  return [peers.includes(picked) ? picked : undefined, setPicked]
}

function RequestPayloadFormat({ requestId }: { requestId: string }) {
  const encoding = useConfigBinder<'tcp', PayloadEncoding>(requestId)('encoding')
  const lineEnding = useConfigBinder<'tcp', LineEnding>(requestId)('lineEnding')
  return <PayloadFormat encoding={encoding} lineEnding={lineEnding} />
}

interface TargetSelectProps {
  peers: string[]
  defaultTarget: string
  value: string | undefined
  onChange: (target: string) => void
}

function TargetSelect({ peers, defaultTarget, value, onChange }: TargetSelectProps) {
  if (peers.length === 0) return null
  const format = (option: string): string => (option === DEFAULT_TARGET ? defaultTarget : option)
  return (
    <OptionSelect
      label="Send to"
      className="w-48 font-mono text-xs"
      options={[DEFAULT_TARGET, ...peers]}
      format={format}
      value={value ?? DEFAULT_TARGET}
      onChange={onChange}
    />
  )
}
