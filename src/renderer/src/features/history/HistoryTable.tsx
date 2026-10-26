import type { KeyboardEvent } from 'react'
import { CircleCheck, CircleX, type LucideIcon } from 'lucide-react'
import type { HistoryEntry } from '@shared/types/history'
import { formatBytes, formatDuration } from '@shared/utils/format'
import { MethodBadge } from '@/components/RequestBadge'
import { cn } from '@/lib/utils'
import { useTabStore } from '@/stores/tab-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

const HEADINGS = ['Time', 'Request', 'Environment', 'Status', 'Duration', 'Size', 'Tests']
const CELL = 'px-3 py-2 align-top'
const NUMBER = cn(CELL, 'font-mono tabular-nums')

/** The requests sent, newest first. A row opens its request, unless the request has been deleted since. */
export function HistoryTable({ entries }: { entries: HistoryEntry[] }) {
  return (
    <table aria-label="Sent requests" className="w-full border-collapse text-xs">
      <HeaderRow />
      <tbody>
        {entries.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} />
        ))}
      </tbody>
    </table>
  )
}

function HeaderRow() {
  return (
    <thead className="sticky top-0 bg-panel text-left text-muted-foreground">
      <tr>
        {HEADINGS.map((heading) => (
          <th key={heading} scope="col" className={cn(CELL, 'font-medium')}>
            {heading}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function useRowProps(entry: HistoryEntry) {
  const exists = useWorkspaceStore((state) => entry.requestId in state.requests)
  const open = (): void => useTabStore.getState().open(entry.requestId)
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && exists) open()
  }
  const className = cn('border-t border-border/60', exists ? 'cursor-pointer hover:bg-surface' : 'opacity-70')
  const title = exists ? 'Open request' : 'The request was deleted'
  return { tabIndex: exists ? 0 : -1, title, onClick: exists ? open : undefined, onKeyDown, className }
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const answered = entry.status > 0
  return (
    <tr {...useRowProps(entry)}>
      <WhenCell at={entry.at} />
      <RequestCell entry={entry} />
      <td className={CELL}>{entry.environmentName ?? <span className="text-muted-foreground">None</span>}</td>
      <StatusCell entry={entry} />
      <td className={NUMBER}>{answered ? formatDuration(entry.durationMs) : '–'}</td>
      <td className={NUMBER}>{answered ? formatBytes(entry.sizeBytes) : '–'}</td>
      <TestsCell entry={entry} />
    </tr>
  )
}

/** Today's requests show the time; older ones the date too. The full timestamp is on hover. */
function WhenCell({ at }: { at: number }) {
  const date = new Date(at)
  const today = date.toDateString() === new Date().toDateString()
  return (
    <td className={cn(NUMBER, 'whitespace-nowrap')} title={date.toLocaleString()}>
      {today ? date.toLocaleTimeString() : date.toLocaleString()}
    </td>
  )
}

function RequestCell({ entry }: { entry: HistoryEntry }) {
  return (
    <td className={cn(CELL, 'w-1/2 max-w-0')}>
      <div className="flex items-center gap-2">
        <MethodBadge method={entry.method} className="w-auto" />
        <span className="truncate font-medium">{entry.requestName}</span>
      </div>
      <div className="truncate font-mono text-[11px] text-muted-foreground select-text" title={entry.url}>
        {entry.url}
      </div>
    </td>
  )
}

function statusText(entry: HistoryEntry): string {
  if (entry.status > 0) return `${entry.status} ${entry.statusText}`
  return entry.error === 'Request cancelled' ? 'Cancelled' : 'No response'
}

function StatusCell({ entry }: { entry: HistoryEntry }) {
  const tone = entry.status === 0 || entry.status >= 400 ? 'text-destructive' : entry.status < 300 ? 'text-success' : ''
  return (
    <td className={cn(CELL, 'font-mono whitespace-nowrap', tone)} title={entry.error}>
      {statusText(entry)}
    </td>
  )
}

function TestsCell({ entry }: { entry: HistoryEntry }) {
  if (entry.testsPassed + entry.testsFailed === 0) return <td className={cn(CELL, 'text-muted-foreground')}>–</td>
  const label = `${entry.testsPassed} passed, ${entry.testsFailed} failed`
  return (
    <td className={cn(CELL, 'whitespace-nowrap')} aria-label={label}>
      <TestCount icon={CircleCheck} tone="text-success" count={entry.testsPassed} />
      <TestCount icon={CircleX} tone="ml-3 text-destructive" count={entry.testsFailed} />
    </td>
  )
}

function TestCount({ icon: Icon, tone, count }: { icon: LucideIcon; tone: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon aria-hidden className={cn('size-3.5', tone)} />
      {count}
    </span>
  )
}
