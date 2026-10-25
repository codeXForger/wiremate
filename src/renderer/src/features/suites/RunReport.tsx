import { runInsights } from '@shared/suites/run-insights'
import { Hint } from '@/components/Hint'
import { useSuiteStore, type LiveRun } from '@/stores/suite-store'
import { KpiRow, StatusCodes } from './dashboard/KpiRow'
import { ResultsSection } from './dashboard/ResultsSection'
import { RunHeader } from './dashboard/RunHeader'
import { RunOverview } from './dashboard/RunOverview'
import { viewOfLive, viewOfRun, type RunView } from './dashboard/run-view'
import { useNow } from './dashboard/use-now'

/** The run in progress, or else the most recent one. */
export function LatestRun({ suiteId }: { suiteId: string }) {
  const live = useSuiteStore((state) => state.live[suiteId])
  const latest = useSuiteStore((state) => state.history[suiteId]?.[0])
  if (live) return <LiveReport live={live} />
  if (!latest) return <Hint>Run the suite to see the results of every request and test here.</Hint>
  return <RunReport view={viewOfRun(latest)} />
}

const LIVE_TICK_MS = 250

function LiveReport({ live }: { live: LiveRun }) {
  const now = useNow(LIVE_TICK_MS)
  return <RunReport view={viewOfLive(live, now)} />
}

/** A run as a dashboard: verdict, pass rate, headline numbers, status codes, then every request. */
export function RunReport({ view }: { view: RunView }) {
  const insights = runInsights(view.results)
  return (
    <div className="h-full overflow-auto">
      <div className="flex flex-col gap-4 p-4">
        <RunHeader view={view} />
        <RunOverview view={view} insights={insights} />
        <KpiRow view={view} insights={insights} />
        <StatusCodes insights={insights} />
        <ResultsSection results={view.results} />
      </div>
    </div>
  )
}
