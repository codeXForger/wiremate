import { CircleCheck, CircleMinus, CircleX } from 'lucide-react'
import { runPassed, summarizeRun } from '@shared/suites/run-summary'
import type { RequestOutcome, RequestRunResult, RunSummary } from '@shared/types/suite'
import { formatDuration } from '@shared/utils/format'
import { tallyTests } from '@shared/utils/test-results'
import { Hint } from '@/components/Hint'
import { cn } from '@/lib/utils'
import { useSuiteStore } from '@/stores/suite-store'
import { TestList } from '../response/TestResults'
import { describeRun } from './run-caption'

/** The run in progress, or else the most recent one. */
export function LatestRun({ suiteId }: { suiteId: string }) {
  const live = useSuiteStore((state) => state.live[suiteId])
  const latest = useSuiteStore((state) => state.history[suiteId]?.[0])
  if (live) {
    const progress = `Running ${live.results.length} of ${live.total}…`
    return <RunReport results={live.results} summary={summarizeRun(live.results, 0)} caption={progress} />
  }
  if (!latest) return <Hint>Run the suite to see the results of every request and test here.</Hint>
  return <RunReport results={latest.results} summary={latest.summary} caption={describeRun(latest)} />
}

interface RunReportProps {
  results: RequestRunResult[]
  summary: RunSummary
  caption: string
}

export function RunReport({ results, summary, caption }: RunReportProps) {
  return (
    <div className="flex h-full flex-col overflow-auto">
      <SummaryBar summary={summary} caption={caption} />
      <ol aria-label="Run results" className="flex flex-col p-1.5">
        {results.map((result, index) => (
          <ResultRow key={`${index}-${result.requestId}`} result={result} />
        ))}
      </ol>
    </div>
  )
}

const SUMMARY_CLASS = 'flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-2 text-xs'

function SummaryBar({ summary, caption }: { summary: RunSummary; caption: string }) {
  const verdict = runPassed(summary) ? 'text-success' : 'text-destructive'
  return (
    <div role="status" aria-label="Run summary" className={SUMMARY_CLASS}>
      <span className={cn('font-medium', verdict)}>{`${summary.passed} passed, ${summary.failed} failed`}</span>
      {summary.skipped > 0 && <span className="text-muted-foreground">{`${summary.skipped} skipped`}</span>}
      <span>{`Tests ${summary.testsPassed}/${summary.tests} passed`}</span>
      {summary.durationMs > 0 && <span className="text-muted-foreground">{formatDuration(summary.durationMs)}</span>}
      <span className="ml-auto text-muted-foreground">{caption}</span>
    </div>
  )
}

const OUTCOME_ICON = { passed: CircleCheck, failed: CircleX, skipped: CircleMinus }
const OUTCOME_TONE: Record<RequestOutcome, string> = {
  passed: 'text-success',
  failed: 'text-destructive',
  skipped: 'text-muted-foreground'
}

const RESULT_CLASS = 'rounded-md px-1.5 py-1 text-[13px] hover:bg-surface'

function ResultRow({ result }: { result: RequestRunResult }) {
  return (
    <li aria-label={`${result.outcome}: ${result.name}`} className={RESULT_CLASS}>
      <details>
        <summary className="flex cursor-pointer items-center gap-2">
          <OutcomeIcon outcome={result.outcome} />
          <ResultLine result={result} />
        </summary>
        <ResultDetail result={result} />
      </details>
    </li>
  )
}

function OutcomeIcon({ outcome }: { outcome: RequestOutcome }) {
  const Icon = OUTCOME_ICON[outcome]
  return <Icon aria-hidden className={cn('size-3.5 shrink-0', OUTCOME_TONE[outcome])} />
}

function ResultLine({ result }: { result: RequestRunResult }) {
  const tests = tallyTests(result.tests)
  return (
    <>
      <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">{result.method ?? '—'}</span>
      <span className="min-w-0 truncate">{result.name}</span>
      <span className="ml-auto flex shrink-0 gap-3 font-mono text-[11px] text-muted-foreground">
        {result.status > 0 && <span>{result.status}</span>}
        {result.outcome !== 'skipped' && <span>{formatDuration(result.durationMs)}</span>}
        {tests.total > 0 && <span>{`${tests.passed}/${tests.total} tests`}</span>}
      </span>
    </>
  )
}

function ResultDetail({ result }: { result: RequestRunResult }) {
  return (
    <div className="flex flex-col gap-2 py-2 pl-6 text-xs">
      {result.url && <p className="font-mono break-all text-muted-foreground">{result.url}</p>}
      {result.error && <p className="font-mono break-all text-destructive">{result.error}</p>}
      {result.tests.length > 0 && <TestList tests={result.tests} />}
    </div>
  )
}
