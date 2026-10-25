import { STATUS_CLASSES, type RunInsights, type StatusClass } from '@shared/suites/run-insights'
import { formatDuration } from '@shared/utils/format'
import type { RunView } from './run-view'
import { StatTile } from './StatTile'

const STATUS_LABEL: Record<StatusClass, string> = {
  '2xx': '2xx',
  '3xx': '3xx',
  '4xx': '4xx',
  '5xx': '5xx',
  none: 'No response'
}

function milliseconds(value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : formatDuration(value)
}

interface Tile {
  label: string
  value: string
  detail?: string
}

function countTiles({ summary }: RunView): Tile[] {
  const skipped = summary.skipped > 0 ? `, ${summary.skipped} skipped` : ''
  const requests = `${summary.passed} passed, ${summary.failed} failed${skipped}`
  const tests = `${summary.testsPassed} passed, ${summary.testsFailed} failed`
  return [
    { label: 'Requests', value: String(summary.requests), detail: requests },
    { label: 'Tests', value: String(summary.tests), detail: tests }
  ]
}

function timeTiles({ summary }: RunView, insights: RunInsights): Tile[] {
  return [
    { label: 'Total time', value: milliseconds(summary.durationMs), detail: 'start to finish' },
    {
      label: 'Average response',
      value: milliseconds(insights.averageMs),
      detail: `over ${insights.answered} responses`
    },
    { label: 'Slowest', value: milliseconds(insights.slowest?.durationMs), detail: insights.slowest?.name },
    { label: 'Fastest', value: milliseconds(insights.fastest?.durationMs), detail: insights.fastest?.name }
  ]
}

/** Headline numbers in a row of tiles: counts, then timings. */
export function KpiRow({ view, insights }: { view: RunView; insights: RunInsights }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
      {[...countTiles(view), ...timeTiles(view, insights)].map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </div>
  )
}

/** How the responses answered, by status class. Classes nobody got are left out. */
export function StatusCodes({ insights }: { insights: RunInsights }) {
  const shown = STATUS_CLASSES.filter((key) => insights.statusCodes[key] > 0)
  if (shown.length === 0) return null
  return (
    <ul aria-label="Status codes" className="flex flex-wrap items-center gap-2 text-xs">
      <li className="text-muted-foreground">Status codes</li>
      {shown.map((key) => (
        <li key={key} className="rounded-md border bg-panel px-2.5 py-1">
          <span className="text-muted-foreground">{STATUS_LABEL[key]}</span>{' '}
          <span className="font-medium">{insights.statusCodes[key]}</span>
        </li>
      ))}
    </ul>
  )
}
