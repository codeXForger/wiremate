import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { runPassed } from '@shared/suites/run-summary'
import type { SuiteRun } from '@shared/types/suite'
import { formatDuration } from '@shared/utils/format'
import { Hint } from '@/components/Hint'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSuiteStore } from '@/stores/suite-store'
import { describeRun } from './run-caption'
import { viewOfRun } from './dashboard/run-view'
import { RunReport } from './RunReport'

const NO_RUNS: SuiteRun[] = []

export function RunHistory({ suiteId }: { suiteId: string }) {
  const runs = useSuiteStore((state) => state.history[suiteId] ?? NO_RUNS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = runs.find((run) => run.id === selectedId)
  if (selected) return <PastRun run={selected} onBack={() => setSelectedId(null)} />
  if (runs.length === 0) return <Hint>Every run of this suite is kept here.</Hint>
  return (
    <ul aria-label="Past runs" className="flex flex-col overflow-auto p-1.5">
      {runs.map((run) => (
        <HistoryRow key={run.id} run={run} onOpen={() => setSelectedId(run.id)} />
      ))}
    </ul>
  )
}

function PastRun({ run, onBack }: { run: SuiteRun; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Button variant="ghost" className="m-1.5 self-start" onClick={onBack}>
        <ArrowLeft /> All runs
      </Button>
      <RunReport view={viewOfRun(run)} />
    </div>
  )
}

const ROW_CLASS = 'flex w-full items-center gap-4 rounded-md px-2 py-1.5 text-left text-xs hover:bg-surface'

function HistoryRow({ run, onOpen }: { run: SuiteRun; onOpen: () => void }) {
  const { summary } = run
  const tone = runPassed(summary) ? 'text-success' : 'text-destructive'
  return (
    <li>
      <button type="button" className={ROW_CLASS} onClick={onOpen}>
        <span className="min-w-0 flex-1 truncate">{describeRun(run)}</span>
        <span className={cn('font-medium', tone)}>{`${summary.passed} passed, ${summary.failed} failed`}</span>
        <span>{`Tests ${summary.testsPassed}/${summary.tests}`}</span>
        <span className="w-16 text-right text-muted-foreground">{formatDuration(summary.durationMs)}</span>
      </button>
    </li>
  )
}
