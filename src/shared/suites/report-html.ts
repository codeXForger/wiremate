import type { RequestOutcome, RequestRunResult, SuiteRun } from '../types/suite'
import type { TestResult } from '../types/scripting'
import { formatDuration } from '../utils/format'
import { tallyTests } from '../utils/test-results'
import { runPassed } from './run-summary'
import { runInsights, STATUS_CLASSES, type RunInsights } from './run-insights'

/** Everything a report says is data from the run; it all goes through this before reaching the page. */
export function escapeHtml(text: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return text.replace(/[&<>"']/g, (char) => entities[char] ?? char)
}

const OUTCOME: Record<RequestOutcome, { mark: string; label: string; colour: string }> = {
  passed: { mark: '✓', label: 'Passed', colour: '#2f8f5b' },
  failed: { mark: '✗', label: 'Failed', colour: '#c24141' },
  skipped: { mark: '–', label: 'Skipped', colour: '#8891a2' }
}

const STYLE = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11px/1.45 -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1d2230; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 22px 0 8px; }
  h3 { font-size: 12px; margin: 14px 0 4px; }
  .muted { color: #5e6678; }
  .mono { font-family: Menlo, Consolas, monospace; font-size: 10px; }
  .verdict { display: inline-block; margin-top: 8px; padding: 3px 10px; border-radius: 4px; font-weight: 600; color: #fff; }
  .overview { display: flex; gap: 24px; align-items: center; margin-top: 18px; padding: 14px; border: 1px solid #d6dbe4; border-radius: 6px; }
  .hero { font-size: 40px; font-weight: 600; line-height: 1; }
  .bars { flex: 1; display: grid; gap: 12px; }
  .track { display: flex; gap: 2px; height: 8px; border-radius: 4px; overflow: hidden; background: #eef1f5; }
  .legend { display: flex; gap: 14px; margin-top: 4px; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .tile { border: 1px solid #d6dbe4; border-radius: 6px; padding: 8px 10px; }
  .tile b { display: block; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e3e7ee; vertical-align: top; }
  th { font-weight: 600; color: #5e6678; }
  tr, .request { break-inside: avoid; }
  .tests { margin: 0; padding-left: 0; list-style: none; }
  .error { color: #c24141; }
  footer { margin-top: 24px; color: #8891a2; font-size: 9px; }
`

function verdictOf(run: SuiteRun): { text: string; colour: string } {
  if (run.stopped) return { text: 'Stopped', colour: '#5e6678' }
  if (runPassed(run.summary)) return { text: 'All passed', colour: OUTCOME.passed.colour }
  return { text: `${run.summary.failed} failed`, colour: OUTCOME.failed.colour }
}

function header(run: SuiteRun): string {
  const verdict = verdictOf(run)
  const meta = [
    `Started ${new Date(run.startedAt).toLocaleString()}`,
    `Environment ${run.environmentName ?? 'none'}`,
    `Total ${formatDuration(run.summary.durationMs)}`
  ]
  return `<header>
    <h1>${escapeHtml(run.suiteName)} — test run report</h1>
    <div class="muted">${meta.map(escapeHtml).join(' · ')}</div>
    <span class="verdict" style="background:${verdict.colour}">${escapeHtml(verdict.text)}</span>
  </header>`
}

interface Part {
  outcome: RequestOutcome
  value: number
}

function bar(title: string, parts: Part[], total: number): string {
  const segments = parts
    .filter((part) => part.value > 0)
    .map(
      (part) =>
        `<span style="width:${(part.value / Math.max(total, 1)) * 100}%;background:${OUTCOME[part.outcome].colour}"></span>`
    )
  const legend = parts.map(
    (part) => `<span>${OUTCOME[part.outcome].mark} ${OUTCOME[part.outcome].label} <b>${part.value}</b></span>`
  )
  return `<div><div class="muted">${escapeHtml(title)}</div><div class="track">${segments.join('')}</div><div class="legend">${legend.join('')}</div></div>`
}

function hero(run: SuiteRun, insights: RunInsights): string {
  const rate = insights.testPassRate ?? run.summary.passed / Math.max(run.summary.requests, 1)
  const label = insights.testPassRate === null ? 'of requests passed' : 'of tests passed'
  return `<div><div class="hero">${Math.round(rate * 100)}%</div><div class="muted">${label}</div></div>`
}

function bars({ summary }: SuiteRun): string {
  const requests: Part[] = [
    { outcome: 'passed', value: summary.passed },
    { outcome: 'failed', value: summary.failed },
    { outcome: 'skipped', value: summary.skipped }
  ]
  const tests: Part[] = [
    { outcome: 'passed', value: summary.testsPassed },
    { outcome: 'failed', value: summary.testsFailed }
  ]
  const both =
    bar(`Requests (${summary.requests})`, requests, summary.requests) +
    bar(`Tests (${summary.tests})`, tests, summary.tests)
  return `<div class="bars">${both}</div>`
}

function overview(run: SuiteRun, insights: RunInsights): string {
  return `<section class="overview">${hero(run, insights)}${bars(run)}</section>`
}

function time(value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : formatDuration(value)
}

type Cell = [label: string, value: string, detail: string]

function countCells({ summary }: SuiteRun): Cell[] {
  const requests = `${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`
  return [
    ['Requests', String(summary.requests), requests],
    ['Tests', String(summary.tests), `${summary.testsPassed} passed, ${summary.testsFailed} failed`]
  ]
}

function timeCells(run: SuiteRun, insights: RunInsights): Cell[] {
  return [
    ['Total time', time(run.summary.durationMs), 'start to finish'],
    ['Average response', time(insights.averageMs), `over ${insights.answered} responses`],
    ['Slowest', time(insights.slowest?.durationMs), insights.slowest?.name ?? ''],
    ['Fastest', time(insights.fastest?.durationMs), insights.fastest?.name ?? '']
  ]
}

function tiles(run: SuiteRun, insights: RunInsights): string {
  const cell = ([label, value, detail]: Cell): string =>
    `<div class="tile"><span class="muted">${label}</span><b>${escapeHtml(value)}</b><span class="muted">${escapeHtml(detail)}</span></div>`
  return `<section class="tiles">${[...countCells(run), ...timeCells(run, insights)].map(cell).join('')}</section>`
}

function statusCodes(insights: RunInsights): string {
  const shown = STATUS_CLASSES.filter((key) => insights.statusCodes[key] > 0)
  if (shown.length === 0) return ''
  const items = shown.map((key) => `${key === 'none' ? 'No response' : key} <b>${insights.statusCodes[key]}</b>`)
  return `<p class="muted">Status codes: ${items.join(' · ')}</p>`
}

function resultRow(result: RequestRunResult, index: number): string {
  const outcome = OUTCOME[result.outcome]
  const tests = tallyTests(result.tests)
  const cells = [
    String(index + 1),
    `<span style="color:${outcome.colour}">${outcome.mark}</span> ${outcome.label}`,
    escapeHtml(result.method ?? '—'),
    `${escapeHtml(result.name)}<div class="mono muted">${escapeHtml(result.url)}</div>`,
    result.status > 0 ? String(result.status) : '–',
    result.outcome === 'skipped' || result.status === 0 ? '–' : formatDuration(result.durationMs),
    tests.total > 0 ? `${tests.passed}/${tests.total}` : '–'
  ]
  return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
}

function resultsTable(run: SuiteRun): string {
  const head = ['#', 'Result', 'Method', 'Request', 'Status', 'Time', 'Tests'].map((title) => `<th>${title}</th>`)
  return `<h2>Requests</h2><table><thead><tr>${head.join('')}</tr></thead><tbody>${run.results.map(resultRow).join('')}</tbody></table>`
}

function testLine(test: TestResult): string {
  const outcome = test.passed ? OUTCOME.passed : OUTCOME.failed
  const error = test.error ? ` <span class="error">— ${escapeHtml(test.error)}</span>` : ''
  return `<li><span style="color:${outcome.colour}">${outcome.mark}</span> ${escapeHtml(test.name)}${error}</li>`
}

function requestDetail(result: RequestRunResult): string {
  const error = result.error ? `<div class="error mono">${escapeHtml(result.error)}</div>` : ''
  const tests = result.tests.length > 0 ? `<ul class="tests">${result.tests.map(testLine).join('')}</ul>` : ''
  return `<div class="request"><h3>${OUTCOME[result.outcome].mark} ${escapeHtml(result.name)}</h3>${error}${tests}</div>`
}

function details(run: SuiteRun): string {
  const worth = run.results.filter((result) => result.tests.length > 0 || result.error)
  if (worth.length === 0) return ''
  return `<h2>Tests and errors</h2>${worth.map(requestDetail).join('')}`
}

/** A self-contained, printable HTML page of a finished run, with no scripts and no outside resources. */
export function runReportHtml(run: SuiteRun, generatedAt: number): string {
  const insights = runInsights(run.results)
  const body = [
    header(run),
    overview(run, insights),
    tiles(run, insights),
    statusCodes(insights),
    resultsTable(run),
    details(run)
  ]
  const footer = `<footer>Generated by WireMate on ${escapeHtml(new Date(generatedAt).toLocaleString())}</footer>`
  const title = `${escapeHtml(run.suiteName)} — test run report`
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${STYLE}</style></head><body>${body.join('')}${footer}</body></html>`
}

/** "Smoke tests 2026-10-26 14-02.pdf": the suggested file name for a run's report. */
export function reportFileName(run: SuiteRun): string {
  const stamp = new Date(run.startedAt)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const date = `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`
  const clock = `${pad(stamp.getHours())}-${pad(stamp.getMinutes())}`
  const safeName = run.suiteName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Suite'
  return `${safeName} ${date} ${clock}.pdf`
}
