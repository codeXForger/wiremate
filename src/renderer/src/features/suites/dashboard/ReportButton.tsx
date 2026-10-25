import { useState } from 'react'
import { FileDown, LoaderCircle } from 'lucide-react'
import type { WireMateApi } from '@shared/ipc'
import { errorMessage } from '@shared/scripting/describe'
import { reportFileName } from '@shared/suites/report-html'
import type { SuiteRun } from '@shared/types/suite'
import { Button } from '@/components/ui/button'

type SaveState =
  { status: 'idle' | 'choosing' | 'creating' } | { status: 'saved'; path: string } | { status: 'failed'; error: string }

export const STALE_APP = 'Restart WireMate to finish updating, then try again.'

const LABEL = { idle: 'Download PDF', choosing: 'Choose where to save…', creating: 'Creating PDF…' }

/** A window opened before an update can have the new screen but an old bridge or main process. */
function describe(error: unknown): string {
  const message = errorMessage(error)
  return message.includes('No handler registered') ? STALE_APP : message
}

type ReportBridge = Pick<WireMateApi, 'chooseReportFile' | 'savePdfReport'>

function reportBridge(): ReportBridge | null {
  const bridge = window.wiremate as Partial<WireMateApi> | undefined
  if (typeof bridge?.chooseReportFile !== 'function' || typeof bridge.savePdfReport !== 'function') return null
  return bridge as ReportBridge
}

async function saveReport(run: SuiteRun, setState: (state: SaveState) => void): Promise<void> {
  const bridge = reportBridge()
  if (!bridge) throw new Error(STALE_APP)
  setState({ status: 'choosing' })
  const path = await bridge.chooseReportFile(reportFileName(run))
  if (path === null) {
    setState({ status: 'idle' })
    return
  }
  setState({ status: 'creating' })
  await bridge.savePdfReport(run, path)
  setState({ status: 'saved', path })
}

/** Saves the run as a PDF report where the user chooses, showing each step, then offers to open it. */
function useSaveReport(run: SuiteRun): { state: SaveState; save: () => void } {
  const [state, setState] = useState<SaveState>({ status: 'idle' })
  const save = (): void => {
    saveReport(run, setState).catch((error: unknown) => setState({ status: 'failed', error: describe(error) }))
  }
  return { state, save }
}

export function ReportButton({ run }: { run: SuiteRun }) {
  const { state, save } = useSaveReport(run)
  const busy = state.status === 'choosing' || state.status === 'creating'
  if (!window.wiremate) return null
  return (
    <span className="flex items-center gap-2 text-xs">
      <SaveOutcome state={state} />
      <Button size="sm" disabled={busy} onClick={save}>
        {busy ? <LoaderCircle className="animate-spin" /> : <FileDown />} {busy ? LABEL[state.status] : LABEL.idle}
      </Button>
    </span>
  )
}

function SaveOutcome({ state }: { state: SaveState }) {
  if (state.status === 'failed')
    return <span role="alert" className="text-destructive">{`Could not save: ${state.error}`}</span>
  if (state.status !== 'saved') return null
  const open = (): void => void window.wiremate?.openReport(state.path)
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      PDF saved
      <Button variant="ghost" size="sm" onClick={open}>
        Open
      </Button>
    </span>
  )
}
