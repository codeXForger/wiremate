// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { SuiteRun } from '@shared/types/suite'
import { PdfReports } from './pdf-reports'

const run: SuiteRun = {
  id: 'run_1',
  suiteId: 'suite_1',
  suiteName: 'Smoke',
  startedAt: 0,
  environmentName: null,
  results: [],
  summary: { requests: 0, passed: 0, failed: 0, skipped: 0, tests: 0, testsPassed: 0, testsFailed: 0, durationMs: 0 }
}

function setup() {
  const render = vi.fn((html: string) => Promise.resolve(new TextEncoder().encode(html.slice(0, 15))))
  const write = vi.fn(() => Promise.resolve())
  return { render, write, reports: new PdfReports({ render, write, now: () => 0 }) }
}

describe('PdfReports', () => {
  it('renders the report, writes it where the user chose and remembers it', async () => {
    const { reports, render, write } = setup()
    const choose = vi.fn(() => Promise.resolve('/out/report.pdf'))
    expect(await reports.save(run, choose)).toBe('/out/report.pdf')
    expect(choose).toHaveBeenCalledWith(expect.stringMatching(/^Smoke \d{4}-\d\d-\d\d \d\d-\d\d\.pdf$/))
    expect(render.mock.calls[0]?.[0]).toContain('Smoke — test run report')
    expect(write).toHaveBeenCalledWith('/out/report.pdf', new TextEncoder().encode('<!doctype html>'))
    expect(reports.wasSaved('/out/report.pdf')).toBe(true)
    expect(reports.wasSaved('/etc/passwd')).toBe(false)
  })

  it('does nothing when the user cancels, and refuses a malformed run', async () => {
    const { reports, render } = setup()
    expect(await reports.save(run, () => Promise.resolve(null))).toBeNull()
    expect(render).not.toHaveBeenCalled()
    await expect(reports.save({ ...run, id: '../x' }, () => Promise.resolve('/a.pdf'))).rejects.toThrow()
  })
})
