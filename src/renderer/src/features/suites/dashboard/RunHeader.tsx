import { CircleCheck, CircleStop, CircleX, LoaderCircle } from 'lucide-react'
import { formatDuration } from '@shared/utils/format'
import { cn } from '@/lib/utils'
import { ReportButton } from './ReportButton'
import type { RunState, RunView } from './run-view'

const STATE_STYLE: Record<RunState, { icon: typeof CircleCheck; tone: string }> = {
  running: { icon: LoaderCircle, tone: 'animate-spin text-primary' },
  stopped: { icon: CircleStop, tone: 'text-[var(--chart-skipped)]' },
  passed: { icon: CircleCheck, tone: 'text-success' },
  failed: { icon: CircleX, tone: 'text-destructive' }
}

function verdict(view: RunView): string {
  if (view.state === 'running') return `Running ${view.results.length} of ${view.total}`
  if (view.state === 'stopped') return 'Stopped'
  return view.state === 'passed' ? 'All passed' : `${view.summary.failed} failed`
}

/** The verdict first (icon and words, never colour alone), then when, where and how long. */
export function RunHeader({ view }: { view: RunView }) {
  const { icon: Icon, tone } = STATE_STYLE[view.state]
  const meta = [new Date(view.startedAt).toLocaleString(), view.environmentName ?? 'No environment']
  return (
    <div role="status" aria-label="Run summary" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="flex items-center gap-2 text-base font-semibold">
        <Icon aria-hidden className={cn('size-5', tone)} />
        {verdict(view)}
      </span>
      <span className="text-xs text-muted-foreground">{meta.join(' · ')}</span>
      <span className="ml-auto text-xs text-muted-foreground">{`Total ${formatDuration(view.summary.durationMs)}`}</span>
      {view.run && <ReportButton key={view.run.id} run={view.run} />}
    </div>
  )
}
