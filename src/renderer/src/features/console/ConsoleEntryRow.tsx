import type { ConsoleEntry, LogLevel } from '@shared/types/scripting'
import { CopyButton } from '@/components/CopyButton'
import { cn } from '@/lib/utils'
import { entryText, formatClock, SOURCE_LABEL } from './console-filter'

const LEVEL_TONE: Record<LogLevel, string> = {
  log: 'text-foreground',
  info: 'text-foreground',
  warn: 'text-amber-500',
  error: 'text-destructive'
}

const ROW_CLASS = 'group flex items-start gap-2 border-b border-border/50 py-1 pr-1 pl-3'

export function ConsoleEntryRow({ entry }: { entry: ConsoleEntry }) {
  return (
    <li aria-label={`${SOURCE_LABEL[entry.source]}: ${entry.message}`} className={ROW_CLASS}>
      <div className="min-w-0 flex-1">
        {entry.detail ? <ExpandableEntry entry={entry} detail={entry.detail} /> : <EntryLine entry={entry} />}
      </div>
      <span className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
        <CopyButton label="Copy entry" text={() => entryText(entry)} />
      </span>
    </li>
  )
}

/** Request and response entries fold out to show their headers and body. */
function ExpandableEntry({ entry, detail }: { entry: ConsoleEntry; detail: string }) {
  return (
    <details>
      <summary className="cursor-pointer list-inside">
        <EntryLine entry={entry} />
      </summary>
      <pre className="mt-1 ml-4 max-h-64 overflow-auto break-all whitespace-pre-wrap text-muted-foreground">
        {detail}
      </pre>
    </details>
  )
}

function EntryLine({ entry }: { entry: ConsoleEntry }) {
  return (
    <span className="inline-flex min-w-0 gap-2 align-top">
      <span className="shrink-0 text-muted-foreground">{formatClock(entry.at)}</span>
      <span className="w-24 shrink-0 text-muted-foreground">{SOURCE_LABEL[entry.source]}</span>
      {entry.requestName && <span className="shrink-0 text-primary">{entry.requestName}</span>}
      <span className={cn('break-all whitespace-pre-wrap', LEVEL_TONE[entry.level])}>{entry.message}</span>
    </span>
  )
}
