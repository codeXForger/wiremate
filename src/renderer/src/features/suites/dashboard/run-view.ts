import { runPassed, summarizeRun } from '@shared/suites/run-summary'
import type { RequestRunResult, RunSummary, SuiteRun } from '@shared/types/suite'
import type { LiveRun } from '@/stores/suite-store'

export type RunState = 'running' | 'stopped' | 'passed' | 'failed'

/** Everything the dashboard shows, for a finished run or one in progress. */
export interface RunView {
  results: RequestRunResult[]
  summary: RunSummary
  startedAt: number
  environmentName: string | null
  state: RunState
  /** Requests the run will send in all; more than `results` while it is running. */
  total: number
}

export function viewOfRun(run: SuiteRun): RunView {
  const state: RunState = run.stopped ? 'stopped' : runPassed(run.summary) ? 'passed' : 'failed'
  const { results, summary, startedAt, environmentName } = run
  return { results, summary, startedAt, environmentName, state, total: results.length }
}

export function viewOfLive(live: LiveRun, now: number): RunView {
  const summary = summarizeRun(live.results, now - live.startedAt)
  const { results, startedAt, environmentName, total } = live
  return { results, summary, startedAt, environmentName, state: 'running', total }
}
