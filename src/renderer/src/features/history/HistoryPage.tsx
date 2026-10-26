import { useMemo, useState } from 'react'
import { History, Trash2 } from 'lucide-react'
import type { CategoryId } from '@shared/protocols/categories'
import type { HistoryEntry } from '@shared/types/history'
import { Hint } from '@/components/Hint'
import { Button } from '@/components/ui/button'
import { useHistoryStore } from '@/stores/history-store'
import { askToClearHistory } from '../confirm/confirm-delete'
import { historyTitle } from './history-entry'
import { filterHistory, NO_FILTERS, type HistoryFilters } from './history-filter'
import { HistoryFilterBar } from './HistoryFilterBar'
import { HistoryTable } from './HistoryTable'

const NO_ENTRIES: HistoryEntry[] = []
const SECTION_CLASS = 'flex min-h-0 flex-1 flex-col border-t-2 border-t-primary'

/** A section's sent requests as a searchable, filterable table, opened in a tab. */
export function HistoryPage({ category }: { category: CategoryId }) {
  const entries = useHistoryStore((state) => state.entries[category] ?? NO_ENTRIES)
  const [filters, setFilters] = useState<HistoryFilters>(NO_FILTERS)
  const shown = useMemo(() => filterHistory(entries, filters), [entries, filters])
  return (
    <section aria-label={historyTitle(category)} className={SECTION_CLASS}>
      <HistoryHeader category={category} total={entries.length} />
      <HistoryFilterBar entries={entries} filters={filters} onChange={setFilters} shown={shown.length} />
      <div className="min-h-0 flex-1 overflow-auto">
        {shown.length > 0 ? <HistoryTable entries={shown} /> : <EmptyHistory filtered={entries.length > 0} />}
      </div>
    </section>
  )
}

function HistoryHeader({ category, total }: { category: CategoryId; total: number }) {
  return (
    <div className="flex items-center gap-3 border-b px-3 py-2">
      <History className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{historyTitle(category)}</h2>
      <Button size="sm" className="ml-auto" disabled={total === 0} onClick={() => askToClearHistory(category, total)}>
        <Trash2 /> Clear history
      </Button>
    </div>
  )
}

function EmptyHistory({ filtered }: { filtered: boolean }) {
  const text = filtered ? 'No sent request matches these filters.' : 'Requests you send show up here, newest first.'
  return <Hint className="p-4">{text}</Hint>
}
