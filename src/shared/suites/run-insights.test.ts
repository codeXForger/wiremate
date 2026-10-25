import { describe, expect, it } from 'vitest'
import type { RequestRunResult } from '../types/suite'
import { runInsights, statusClass } from './run-insights'

function result(name: string, patch: Partial<RequestRunResult>): RequestRunResult {
  const base = { requestId: name, name, method: 'GET' as const, url: '', statusText: '', tests: [] }
  return { ...base, status: 200, durationMs: 10, outcome: 'passed', ...patch }
}

describe('runInsights', () => {
  it('times the requests that got a response and counts status codes of all that were sent', () => {
    const insights = runInsights([
      result('a', { durationMs: 100, tests: [{ name: 't', passed: true }] }),
      result('b', { durationMs: 300, status: 404, outcome: 'failed', tests: [{ name: 't', passed: false }] }),
      result('c', { durationMs: 20, status: 0, outcome: 'failed' }),
      result('d', { durationMs: 0, status: 0, outcome: 'skipped' })
    ])
    expect(insights).toEqual({
      answered: 2,
      averageMs: 200,
      slowest: { name: 'b', durationMs: 300 },
      fastest: { name: 'a', durationMs: 100 },
      testPassRate: 0.5,
      statusCodes: { '2xx': 1, '3xx': 0, '4xx': 1, '5xx': 0, none: 1 }
    })
  })

  it('has nothing to say about an empty run', () => {
    expect(runInsights([])).toMatchObject({
      answered: 0,
      averageMs: null,
      slowest: null,
      fastest: null,
      testPassRate: null
    })
  })

  it('classes status codes', () => {
    expect([200, 302, 418, 503, 0, 99, 700].map(statusClass)).toEqual([
      '2xx',
      '3xx',
      '4xx',
      '5xx',
      'none',
      'none',
      'none'
    ])
  })
})
