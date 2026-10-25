import type { RequestRunResult } from '../types/suite'

export type StatusClass = '2xx' | '3xx' | '4xx' | '5xx' | 'none'

export const STATUS_CLASSES: readonly StatusClass[] = ['2xx', '3xx', '4xx', '5xx', 'none']

export interface TimedRequest {
  name: string
  durationMs: number
}

/**
 * Numbers about a run beyond pass and fail. Timings count only requests that got a response: a refused connection
 * fails in a millisecond, which says nothing about how fast the API is.
 */
export interface RunInsights {
  /** Requests that got a response, which the timings are about. */
  answered: number
  averageMs: number | null
  slowest: TimedRequest | null
  fastest: TimedRequest | null
  /** Share of tests that passed, 0 to 1; null when the run had no tests. */
  testPassRate: number | null
  statusCodes: Record<StatusClass, number>
}

export function statusClass(status: number): StatusClass {
  if (status >= 200 && status < 600) return `${Math.floor(status / 100)}xx` as StatusClass
  return 'none'
}

function countStatusCodes(sent: RequestRunResult[]): Record<StatusClass, number> {
  const counts = Object.fromEntries(STATUS_CLASSES.map((key) => [key, 0])) as Record<StatusClass, number>
  sent.forEach((result) => (counts[statusClass(result.status)] += 1))
  return counts
}

function extremes(sent: RequestRunResult[]): Pick<RunInsights, 'slowest' | 'fastest'> {
  if (sent.length === 0) return { slowest: null, fastest: null }
  const sorted = [...sent].sort((a, b) => a.durationMs - b.durationMs)
  const timed = (result: RequestRunResult): TimedRequest => ({ name: result.name, durationMs: result.durationMs })
  return { fastest: timed(sorted[0] as RequestRunResult), slowest: timed(sorted.at(-1) as RequestRunResult) }
}

export function runInsights(results: RequestRunResult[]): RunInsights {
  const sent = results.filter((result) => result.outcome !== 'skipped')
  const answered = sent.filter((result) => result.status > 0)
  const total = answered.reduce((sum, result) => sum + result.durationMs, 0)
  const tests = results.flatMap((result) => result.tests)
  const testPassRate = tests.length === 0 ? null : tests.filter((test) => test.passed).length / tests.length
  return {
    answered: answered.length,
    averageMs: answered.length === 0 ? null : total / answered.length,
    ...extremes(answered),
    testPassRate,
    statusCodes: countStatusCodes(sent)
  }
}
