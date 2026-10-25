import { useState } from 'react'
import { FileDown, LoaderCircle } from 'lucide-react'
import type { WireMateApi } from '@shared/ipc'
import { errorMessage } from '@shared/scripting/describe'
import { reportFileName } from '@shared/suites/report-html'
import type { SuiteRun } from '@shared/types/suite'
import { Button } from '@/components/ui/button'
import { useToastStore } from '@/stores/toast-store'

type Step = 'idle' | 'choosing' | 'creating'

export const STALE_APP = 'Restart WireMate to finish updating, then try again.'

const LABEL: Record<Step, string> = {
  idle: 'Download PDF',
  choosing: 'Choose where to save…',
  creating: 'Creating PDF…'
}

/** A window opened before an update can have the new screen but an old bridge or main process. */
function describe(error: unknown): string {
  const message = errorMessage(error)
  return message.includes('No handler registered') ? STALE_APP : message
}

type ReportBridge = Pick<WireMateApi, 'chooseReportFile' | 'savePdfReport'>

function reportBridge(): ReportBridge {
  const bridge = window.wiremate as Partial<WireMateApi> | undefined
  if (typeof bridge?.chooseReportFile !== 'function' || typeof bridge.savePdfReport !== 'function') {
    throw new Error(STALE_APP)
  }
  return bridge as ReportBridge
}

/** Choose a file, create the PDF, then say where it went. */
async function saveReport(run: SuiteRun, setStep: (step: Step) => void): Promise<void> {
  const bridge = reportBridge()
  setStep('choosing')
  const path = await bridge.chooseReportFile(reportFileName(run))
  if (path === null) return
  setStep('creating')
  await bridge.savePdfReport(run, path)
  useToastStore.getState().show({ tone: 'success', title: 'Report saved', detail: path })
}

function useSaveReport(run: SuiteRun): { step: Step; save: () => void } {
  const [step, setStep] = useState<Step>('idle')
  const save = (): void => {
    saveReport(run, setStep)
      .catch((error: unknown) =>
        useToastStore.getState().show({ tone: 'error', title: 'Could not save the report', detail: describe(error) })
      )
      .finally(() => setStep('idle'))
  }
  return { step, save }
}

/** Saves the run as a PDF report where the user chooses, showing each step; a toast confirms or explains. */
export function ReportButton({ run }: { run: SuiteRun }) {
  const { step, save } = useSaveReport(run)
  if (!window.wiremate) return null
  const busy = step !== 'idle'
  return (
    <Button size="sm" disabled={busy} onClick={save}>
      {busy ? <LoaderCircle className="animate-spin" /> : <FileDown />} {LABEL[step]}
    </Button>
  )
}
