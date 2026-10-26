import type { RunInsights } from '@shared/suites/run-insights'
import { OUTCOME_STYLE } from './outcomes'
import type { RunView } from './run-view'
import { StackedBar, type BarSegment } from './StackedBar'

function segment(kind: 'passed' | 'failed' | 'skipped', value: number): BarSegment {
  return { ...OUTCOME_STYLE[kind], value }
}

/** The single headline number: how much of the run passed (its tests, or its requests when it has none). */
function headline(view: RunView, insights: RunInsights): { value: string; label: string } {
  const rate = insights.testPassRate ?? view.summary.passed / Math.max(view.results.length, 1)
  const label = insights.testPassRate === null ? 'of requests passed' : 'of tests passed'
  return { value: `${Math.round(rate * 100)}%`, label }
}

export function RunOverview({ view, insights }: { view: RunView; insights: RunInsights }) {
  return (
    <div className="grid gap-6 rounded-lg border bg-panel p-4 sm:grid-cols-[auto_1fr]">
      <Hero view={view} insights={insights} />
      <Bars view={view} />
    </div>
  )
}

function Hero({ view, insights }: { view: RunView; insights: RunInsights }) {
  const hero = headline(view, insights)
  return (
    <div aria-label="Pass rate" role="group" className="flex flex-col justify-center pr-4 sm:border-r">
      <span className="text-5xl font-semibold">{view.results.length === 0 ? '–' : hero.value}</span>
      <span className="text-xs text-muted-foreground">{hero.label}</span>
    </div>
  )
}

function Bars({ view }: { view: RunView }) {
  const { summary } = view
  const requests = [
    segment('passed', summary.passed),
    segment('failed', summary.failed),
    segment('skipped', summary.skipped)
  ]
  const tests = [segment('passed', summary.testsPassed), segment('failed', summary.testsFailed)]
  return (
    <div className="flex flex-col gap-4">
      <StackedBar title={`Requests (${view.results.length} of ${view.total})`} segments={requests} total={view.total} />
      <StackedBar title={`Tests (${summary.tests})`} segments={tests} total={summary.tests} />
    </div>
  )
}
