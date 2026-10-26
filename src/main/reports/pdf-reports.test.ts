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

type Render = (html: string) => Promise<Uint8Array>

function setup(render = vi.fn<Render>((html) => Promise.resolve(new TextEncoder().encode(html.slice(0, 15))))) {
  const write = vi.fn(() => Promise.resolve())
  return { render, write, reports: new PdfReports({ render, write, now: () => 0, timeoutMs: 50 }) }
}

describe('PdfReports', () => {
  it('writes the report to a chosen path', async () => {
    const { reports, render, write } = setup()
    reports.allow('/out/report.pdf')
    await reports.write(run, '/out/report.pdf')
    expect(render.mock.calls[0]?.[0]).toContain('Smoke — test run report')
    expect(write).toHaveBeenCalledWith('/out/report.pdf', new TextEncoder().encode('<!doctype html>'))
  })

  it('only writes to a path the user chose, and only once', async () => {
    const { reports, write } = setup()
    await expect(reports.write(run, '/etc/passwd')).rejects.toThrow('Choose where to save the report first')
    reports.allow('/out/a.pdf')
    await reports.write(run, '/out/a.pdf')
    await expect(reports.write(run, '/out/a.pdf')).rejects.toThrow('Choose where to save')
    expect(write).toHaveBeenCalledOnce()
  })

  it('refuses a malformed run and gives up when rendering hangs', async () => {
    const { reports } = setup(vi.fn<Render>(() => new Promise(() => undefined)))
    reports.allow('/out/a.pdf')
    await expect(reports.write({ ...run, id: '../x' }, '/out/a.pdf')).rejects.toThrow()
    reports.allow('/out/a.pdf')
    await expect(reports.write(run, '/out/a.pdf')).rejects.toThrow('Creating the PDF took longer than 0.05 s')
  })
})
