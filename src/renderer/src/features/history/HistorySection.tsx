import { ChevronRight, History } from 'lucide-react'
import type { CategoryId } from '@shared/protocols/categories'
import { useHistoryStore } from '@/stores/history-store'
import { useTabStore } from '@/stores/tab-store'
import { historyTabId } from './history-entry'

const ROW_CLASS = 'group flex h-9 w-full items-center gap-2 border-t px-3 text-left text-[13px] hover:bg-surface'

/** A section pane's link to its request history, which opens in a tab. */
export function HistorySection({ category }: { category: CategoryId }) {
  const count = useHistoryStore((state) => state.entries[category]?.length ?? 0)
  return (
    <button type="button" className={ROW_CLASS} onClick={() => useTabStore.getState().open(historyTabId(category))}>
      <History className="size-3.5 text-muted-foreground" />
      <span className="flex-1">History</span>
      <span className="text-xs text-muted-foreground">{count}</span>
      <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />
    </button>
  )
}
