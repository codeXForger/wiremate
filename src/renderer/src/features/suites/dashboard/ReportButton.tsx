import { useState } from 'react'
import { FileDown, LoaderCircle } from 'lucide-react'
import { errorMessage } from '@shared/scripting/describe'
import type { SuiteRun } from '@shared/types/suite'
import { Button } from '@/components/ui/button'

type SaveState = { status: 'idle' | 'saving' } | { status: 'saved'; path: string } | { status: 'failed'; error: string }

function useSaveReport(run: SuiteRun): { state: SaveState; save: () => void } {
  const [state, setState] = useState<SaveState>({ status: 'idle' })
  const save = (): void => {
    setState({ status: 'saving' })
    window.wiremate
      ?.savePdfReport(run)
      .then((path) => setState(path === null ? { status: 'idle' } : { status: 'saved', path }))
      .catch((error: unknown) => setState({ status: 'failed', error: errorMessage(error) }))
  }
  return { state, save }
}

/** Saves the run as a PDF report where the user chooses, then offers to open it. Only in the desktop app. */
export function ReportButton({ run }: { run: SuiteRun }) {
  const { state, save } = useSaveReport(run)
  if (!window.wiremate) return null
  return (
    <span className="flex items-center gap-2 text-xs">
      <SaveOutcome state={state} />
      <Button size="sm" disabled={state.status === 'saving'} onClick={save}>
        {state.status === 'saving' ? <LoaderCircle className="animate-spin" /> : <FileDown />} Download PDF
      </Button>
    </span>
  )
}

function SaveOutcome({ state }: { state: SaveState }) {
  if (state.status === 'failed') return <span className="text-destructive">{`Could not save: ${state.error}`}</span>
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
