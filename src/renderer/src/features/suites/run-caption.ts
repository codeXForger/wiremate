import type { SuiteRun } from '@shared/types/suite'

/** "23/10/2026, 14:02:11 · Local": when a run started and which environment it used. */
export function describeRun(run: SuiteRun): string {
  const when = new Date(run.startedAt).toLocaleString()
  const caption = `${when} · ${run.environmentName ?? 'No environment'}`
  return run.stopped ? `${caption} · Stopped` : caption
}
