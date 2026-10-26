import { describe, expect, it } from 'vitest'
import type { RequestRunResult, SuiteRun } from '../types/suite'
import { summarizeRun } from './run-summary'
import { escapeHtml, reportFileName, runReportHtml } from './report-html'

function result(name: string, patch: Partial<RequestRunResult>): RequestRunResult {
  const base = { requestId: name, name, method: 'GET' as const, url: `https://api.test/${name}`, statusText: 'OK' }
  return { ...base, status: 200, durationMs: 40, tests: [], outcome: 'passed', ...patch }
}

function run(results: RequestRunResult[], patch: Partial<SuiteRun> = {}): SuiteRun {
  const startedAt = new Date(2026, 9, 26, 14, 2).getTime()
  return {
    id: 'run_1',
    suiteId: 'suite_1',
    suiteName: 'Smoke <tests>',
    startedAt,
    environmentName: 'Local',
    results,
    summary: summarizeRun(results, 1234),
    ...patch
  }
}

const results = [
  result('login', { tests: [{ name: 'status is 200', passed: true }] }),
  result('users', {
    outcome: 'failed',
    status: 404,
    tests: [{ name: 'has <b>users</b>', passed: false, error: 'expected 404 to be 200' }]
  }),
  result('down', { outcome: 'failed', status: 0, error: 'ECONNREFUSED' }),
  result('later', { outcome: 'skipped', status: 0, durationMs: 0, method: null })
]

describe('runReportHtml', () => {
  it('reports the verdict, numbers, every request and every test', () => {
    const html = runReportHtml(run(results), 0)
    expect(html).toContain('<title>Smoke &lt;tests&gt; — test run report</title>')
    expect(html).toContain('>2 failed<')
    expect(html).toContain('Environment Local')
    expect(html).toContain('>50%</div><div class="muted">of tests passed')
    expect(html).toContain('<b>4</b><span class="muted">1 passed, 2 failed, 1 skipped')
    expect(html).toContain('Status codes: 2xx <b>1</b> · 4xx <b>1</b> · No response <b>1</b>')
    expect(html).toContain('https://api.test/users')
    expect(html).toContain('has &lt;b&gt;users&lt;/b&gt; <span class="error">— expected 404 to be 200</span>')
    expect(html).toContain('ECONNREFUSED')
    expect(html).not.toContain('<script')
  })

  it('says when a run was stopped or all passed, and works without tests', () => {
    expect(runReportHtml(run(results, { stopped: true }), 0)).toContain('>Stopped<')
    const clean = runReportHtml(run([result('a', {})], { environmentName: null }), 0)
    expect(clean).toContain('>All passed<')
    expect(clean).toContain('Environment none')
    expect(clean).toContain('of requests passed')
    expect(clean).not.toContain('Tests and errors')
    expect(runReportHtml(run([]), 0)).not.toContain('Status codes')
  })
})

describe('report helpers', () => {
  it('escapes markup', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })

  it('suggests a safe file name', () => {
    expect(reportFileName(run([]))).toBe('Smoke -tests- 2026-10-26 14-02.pdf')
    expect(reportFileName(run([], { suiteName: ' / ' }))).toBe('- 2026-10-26 14-02.pdf')
    expect(reportFileName(run([], { suiteName: '  ' }))).toBe('Suite 2026-10-26 14-02.pdf')
  })
})
