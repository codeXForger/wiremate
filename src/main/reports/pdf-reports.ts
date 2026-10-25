import { runReportHtml } from '@shared/suites/report-html'
import { SuiteRunSchema } from '@shared/suites/suite-schema'
import type { SuiteRun } from '@shared/types/suite'

export const RENDER_TIMEOUT_MS = 30_000

export interface PdfReportDependencies {
  /** Turns an HTML page into PDF bytes. */
  render: (html: string) => Promise<Uint8Array>
  write: (path: string, data: Uint8Array) => Promise<void>
  now?: () => number
  timeoutMs?: number
}

function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

/** Writes suite runs as PDF reports, only to a path the user just picked in the save dialog (`allow`). */
export class PdfReports {
  private readonly allowed = new Set<string>()

  public constructor(private readonly deps: PdfReportDependencies) {}

  /** Records a path the user chose in the save dialog. */
  public allow(path: string): void {
    this.allowed.add(path)
  }

  public async write(run: SuiteRun, path: string): Promise<void> {
    if (!this.allowed.delete(path)) throw new Error('Choose where to save the report first')
    const valid = SuiteRunSchema.parse(run)
    const ms = this.deps.timeoutMs ?? RENDER_TIMEOUT_MS
    const html = runReportHtml(valid, (this.deps.now ?? Date.now)())
    const pdf = await withTimeout(this.deps.render(html), ms, `Creating the PDF took longer than ${ms / 1000} s`)
    await this.deps.write(path, pdf)
  }
}
