import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Ban, X } from 'lucide-react'
import type { ConsoleEntry } from '@shared/types/scripting'
import { Column } from '@/components/Column'
import { CopyButton } from '@/components/CopyButton'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { useConsoleStore } from '@/stores/console-store'
import { OptionSelect } from '../request/components/OptionSelect'
import { entriesText, filterEntries, LEVEL_FILTERS, type LevelFilter } from './console-filter'
import { ConsoleEntryRow } from './ConsoleEntryRow'

export function ConsolePanel() {
  const [filter, setFilter] = useState<LevelFilter>('all')
  return (
    <Column aria-label="Console" role="region" className="border-t bg-panel font-mono text-[11px]">
      <ConsoleToolbar filter={filter} onFilter={setFilter} />
      <ConsoleList filter={filter} />
    </Column>
  )
}

interface FilterProps {
  filter: LevelFilter
  onFilter: (filter: LevelFilter) => void
}

function ConsoleToolbar({ filter, onFilter }: FilterProps) {
  const { clear, toggle } = useConsoleStore.getState()
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b pr-1.5 pl-3 font-sans">
      <h2 className="text-xs font-medium text-muted-foreground">Console</h2>
      <LevelSelect filter={filter} onFilter={onFilter} />
      <CopyButton
        label="Copy all"
        text={() => entriesText(filterEntries(useConsoleStore.getState().entries, filter))}
      />
      <IconButton label="Clear console" icon={Ban} onClick={clear} />
      <IconButton label="Close console" icon={X} onClick={toggle} />
    </div>
  )
}

function LevelSelect({ filter, onFilter }: FilterProps) {
  const className = 'ml-auto h-6 w-24 text-xs'
  return (
    <OptionSelect label="Log level" className={className} options={LEVEL_FILTERS} value={filter} onChange={onFilter} />
  )
}

function ConsoleList({ filter }: { filter: LevelFilter }) {
  const all = useConsoleStore((state) => state.entries)
  const entries = useMemo(() => filterEntries(all, filter), [all, filter])
  if (entries.length === 0) {
    return <Hint className="font-sans">Requests you send and their script output show up here.</Hint>
  }
  return <EntryList entries={entries} />
}

/** Keeps the newest entry in view. Chromium's scrollIntoView returns a promise, so it must not be the effect's result. */
function useScrollToEnd(count: number): RefObject<HTMLDivElement | null> {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [count])
  return end
}

function EntryList({ entries }: { entries: ConsoleEntry[] }) {
  const end = useScrollToEnd(entries.length)
  return (
    <div className="min-h-0 flex-1 overflow-auto select-text">
      <ul aria-label="Console entries">
        {entries.map((entry) => (
          <ConsoleEntryRow key={entry.id} entry={entry} />
        ))}
      </ul>
      <div ref={end} />
    </div>
  )
}
