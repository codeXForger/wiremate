import { useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, CircleAlert, CircleDot, type LucideIcon } from 'lucide-react'
import type { PayloadEncoding } from '@shared/types/protocol'
import type { StreamDirection, StreamEvent, StreamSession } from '@shared/types/response'
import { decodePayload } from '@shared/utils/payload'
import { Column } from '@/components/Column'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useResponseStore } from '@/stores/response-store'
import { OptionSelect } from '../request/components/OptionSelect'
import type { Bound } from '../request/use-field-binder'

const DIRECTION: Record<StreamDirection, { icon: LucideIcon; label: string; className: string }> = {
  in: { icon: ArrowDownLeft, label: 'Received', className: 'text-success' },
  out: { icon: ArrowUpRight, label: 'Sent', className: 'text-primary' },
  system: { icon: CircleDot, label: 'Event', className: 'text-muted-foreground' },
  error: { icon: CircleAlert, label: 'Error', className: 'text-destructive' }
}

const VIEWS: readonly PayloadEncoding[] = ['text', 'hex']

interface StreamTimelineProps {
  requestId: string
  session: StreamSession
}

export function StreamTimeline({ requestId, session }: StreamTimelineProps) {
  const [view, setView] = useState<PayloadEncoding>('text')
  const binary = session.events.some((event) => event.bytes)
  return (
    <Column>
      <SessionHeader requestId={requestId} session={session}>
        {binary && <ViewSelect value={view} onChange={setView} />}
      </SessionHeader>
      <EventList events={session.events} view={view} />
    </Column>
  )
}

function EventList({ events, view }: { events: StreamEvent[]; view: PayloadEncoding }) {
  return (
    <ol aria-label="Session events" className="min-h-0 flex-1 overflow-auto font-mono text-xs">
      {events.map((event) => (
        <EventRow key={event.id} event={event} view={view} />
      ))}
    </ol>
  )
}

function ViewSelect(props: Bound<PayloadEncoding>) {
  return <OptionSelect label="Show data as" className="h-7 w-20 text-xs" options={VIEWS} {...props} />
}

function SessionHeader({ requestId, session, children }: StreamTimelineProps & { children: ReactNode }) {
  const clear = (): void => useResponseStore.getState().clear(requestId)
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b px-3 text-xs">
      <SessionStatus session={session} />
      <span className="ml-auto" />
      {children}
      <Button variant="ghost" size="sm" onClick={clear}>
        Clear
      </Button>
    </div>
  )
}

function statusOf(session: StreamSession): string {
  if (session.connecting) return 'Connecting…'
  return session.connected ? 'Connected' : 'Disconnected'
}

function SessionStatus({ session }: { session: StreamSession }) {
  const peers = session.peers?.length
  return (
    <>
      <span className={cn('size-2 rounded-full', session.connected ? 'bg-success' : 'bg-muted-foreground')} />
      <span>{statusOf(session)}</span>
      {peers !== undefined && (
        <span className="text-muted-foreground">{peers === 1 ? '1 peer' : `${peers} peers`}</span>
      )}
      <span className="text-muted-foreground">{session.events.length} events</span>
    </>
  )
}

function EventRow({ event, view }: { event: StreamEvent; view: PayloadEncoding }) {
  const { icon: Icon, label, className } = DIRECTION[event.direction]
  const data = event.bytes ? decodePayload(event.bytes, view) : event.data
  return (
    <li className="flex items-start gap-3 border-b border-border/50 px-3 py-1.5">
      <time className="shrink-0 text-muted-foreground">{new Date(event.at).toLocaleTimeString()}</time>
      <Icon aria-label={label} className={cn('mt-0.5 size-3.5 shrink-0', className)} />
      {event.peer && <span className="shrink-0 text-muted-foreground">{event.peer}</span>}
      <span className={cn('break-all whitespace-pre-wrap select-text', event.direction === 'error' && className)}>
        {data || '(empty)'}
      </span>
    </li>
  )
}
