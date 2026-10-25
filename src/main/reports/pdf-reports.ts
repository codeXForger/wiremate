import { reportFileName, runReportHtml } from '@shared/suites/report-html'
import { SuiteRunSchema } from '@shared/suites/suite-schema'
import type { SuiteRun } from '@shared/types/suite'

/** Asks where to save, suggesting a file name; null when the user cancels. */
export type ChooseFile = (suggestedName: string) => Promise<string | null>

export interface PdfReportDependencies {
  /** Turns an HTML page into PDF bytes. */
  render: (html: string) => Promise<Uint8Array>
  write: (path: string, data: Uint8Array) => Promise<void>
  now?: () => number
}

/** Saves suite runs as PDF reports, and remembers which files it wrote: only those may be opened from the app. */
export class PdfReports {
  private readonly saved = new Set<string>()

  public constructor(private readonly deps: PdfReportDependencies) {}

  /** Returns where the report was saved, or null when the user cancelled. */
  public async save(run: SuiteRun, chooseFile: ChooseFile): Promise<string | null> {
    const valid = SuiteRunSchema.parse(run)
    const path = await chooseFile(reportFileName(valid))
    if (path === null) return null
    const pdf = await this.deps.render(runReportHtml(valid, (this.deps.now ?? Date.now)()))
    await this.deps.write(path, pdf)
    this.saved.add(path)
    return path
  }

  public wasSaved(path: string): boolean {
    return this.saved.has(path)
  }
}
