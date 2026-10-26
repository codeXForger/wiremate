import { useState } from 'react'
import type { RequestOutcome, RequestRunResult } from '@shared/types/suite'
import { formatDuration } from '@shared/utils/format'
import { tallyTests } from '@shared/utils/test-results'
import { cn } from '@/lib/utils'
import { TestList } from '../../response/TestResults'
import { OUTCOME_STYLE } from './outcomes'

type Filter = 'all' | RequestOutcome

const FILTERS: Filter[] = ['all', 'failed', 'passed', 'skipped']

function matching(results: RequestRunResult[], filter: Filter): RequestRunResult[] {
  return filter === 'all' ? results : results.filter((result) => result.outcome === filter)
}

/** Every request of the run, filterable by outcome; each one opens to show its tests. */
export function ResultsSection({ results }: { results: RequestRunResult[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const slowest = Math.max(1, ...results.map((result) => result.durationMs))
  return (
    <section aria-label="Requests" className="flex flex-col gap-2">
      <FilterRow results={results} filter={filter} onFilter={setFilter} />
      <ol aria-label="Run results" className="flex flex-col rounded-lg border bg-panel p-1.5">
        {matching(results, filter).map((result, index) => (
          <ResultRow key={`${index}-${result.requestId}`} result={result} slowest={slowest} />
        ))}
      </ol>
    </section>
  )
}

interface FilterRowProps {
  results: RequestRunResult[]
  filter: Filter
  onFilter: (filter: Filter) => void
}

const CHIP_CLASS =
  'rounded-md border px-2.5 py-1 text-xs hover:bg-surface aria-pressed:border-ring aria-pressed:bg-surface'

function FilterRow({ results, filter, onFilter }: FilterRowProps) {
  const shown = FILTERS.filter((key) => key === 'all' || matching(results, key).length > 0)
  return (
    <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
      {shown.map((key) => (
        <FilterChip key={key} label={chipLabel(results, key)} pressed={filter === key} onClick={() => onFilter(key)} />
      ))}
    </div>
  )
}

function chipLabel(results: RequestRunResult[], key: Filter): string {
  return `${key === 'all' ? 'All' : OUTCOME_STYLE[key].label} ${matching(results, key).length}`
}

function FilterChip({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} className={CHIP_CLASS} onClick={onClick}>
      {label}
    </button>
  )
}

const ROW_CLASS = 'rounded-md px-2 py-1.5 text-[13px] hover:bg-surface'

function ResultRow({ result, slowest }: { result: RequestRunResult; slowest: number }) {
  const { icon: Icon, tone } = OUTCOME_STYLE[result.outcome]
  return (
    <li aria-label={`${result.outcome}: ${result.name}`} className={ROW_CLASS}>
      <details>
        <summary className="flex cursor-pointer items-center gap-3">
          <Icon aria-hidden className={cn('size-3.5 shrink-0', tone)} />
          <ResultLine result={result} slowest={slowest} />
        </summary>
        <ResultDetail result={result} />
      </details>
    </li>
  )
}

const META_CLASS = 'shrink-0 text-right font-mono text-[11px] text-muted-foreground'

function ResultLine({ result, slowest }: { result: RequestRunResult; slowest: number }) {
  const tests = tallyTests(result.tests)
  return (
    <>
      <span className={cn(META_CLASS, 'w-12 text-left')}>{result.method ?? '—'}</span>
      <span className="min-w-0 flex-1 truncate">{result.name}</span>
      <span className={cn(META_CLASS, 'w-10')}>{result.status > 0 ? result.status : ''}</span>
      <DurationBar result={result} slowest={slowest} />
      <span className={cn(META_CLASS, 'w-20')}>{tests.total > 0 ? `${tests.passed}/${tests.total} tests` : ''}</span>
    </>
  )
}

/** Response time as a thin bar against the slowest request of the run, with the time beside it. */
function DurationBar({ result, slowest }: { result: RequestRunResult; slowest: number }) {
  if (result.outcome === 'skipped') return <span className="w-44 shrink-0" />
  if (result.status === 0) return <span className={cn(META_CLASS, 'w-44')}>no response</span>
  const time = formatDuration(result.durationMs)
  return (
    <span className="flex w-44 shrink-0 items-center gap-2" title={`Response time ${time}`}>
      <BarTrack share={result.durationMs / slowest} />
      <span className={cn(META_CLASS, 'w-14 tabular-nums')}>{time}</span>
    </span>
  )
}

function BarTrack({ share }: { share: number }) {
  return (
    <span className="h-1.5 flex-1 rounded-r bg-surface">
      <span
        className="block h-full rounded-r bg-[var(--chart-duration)]"
        style={{ width: `${Math.max(2, share * 100)}%` }}
      />
    </span>
  )
}

function ResultDetail({ result }: { result: RequestRunResult }) {
  return (
    <div className="flex flex-col gap-2 py-2 pl-7 text-xs select-text">
      {result.url && <p className="font-mono break-all text-muted-foreground">{result.url}</p>}
      {result.error && <p className="font-mono break-all text-destructive">{result.error}</p>}
      {result.tests.length > 0 && <TestList tests={result.tests} />}
    </div>
  )
}
