import { ArrowDownLeft, ArrowUpRight, CircleDot, type LucideIcon } from 'lucide-react'
import type { StreamDirection, StreamEvent, StreamSession } from '@shared/types/response'
import { Column } from '@/components/Column'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useResponseStore } from '@/stores/response-store'

const DIRECTION: Record<StreamDirection, { icon: LucideIcon; label: string; className: string }> = {
  in: { icon: ArrowDownLeft, label: 'Received', className: 'text-success' },
  out: { icon: ArrowUpRight, label: 'Sent', className: 'text-primary' },
  system: { icon: CircleDot, label: 'Event', className: 'text-muted-foreground' }
}

interface StreamTimelineProps {
  requestId: string
  session: StreamSession
}

export function StreamTimeline({ requestId, session }: StreamTimelineProps) {
  return (
    <Column>
      <SessionHeader requestId={requestId} session={session} />
      <ol aria-label="Session events" className="min-h-0 flex-1 overflow-auto font-mono text-xs">
        {session.events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </ol>
    </Column>
  )
}

function SessionHeader({ requestId, session }: StreamTimelineProps) {
  const clear = (): void => useResponseStore.getState().clear(requestId)
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b px-3 text-xs">
      <span className={cn('size-2 rounded-full', session.connected ? 'bg-success' : 'bg-muted-foreground')} />
      <span>{session.connected ? 'Connected' : 'Disconnected'}</span>
      <span className="text-muted-foreground">{session.events.length} events</span>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={clear}>
        Clear
      </Button>
    </div>
  )
}

function EventRow({ event }: { event: StreamEvent }) {
  const { icon: Icon, label, className } = DIRECTION[event.direction]
  return (
    <li className="flex items-start gap-3 border-b border-border/50 px-3 py-1.5">
      <time className="shrink-0 text-muted-foreground">{new Date(event.at).toLocaleTimeString()}</time>
      <Icon aria-label={label} className={cn('mt-0.5 size-3.5 shrink-0', className)} />
      <span className="break-all whitespace-pre-wrap select-text">{event.data || '(empty)'}</span>
    </li>
  )
}
