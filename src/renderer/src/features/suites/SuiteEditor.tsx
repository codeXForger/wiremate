import { useEffect, useState } from 'react'
import { FlaskConical, LoaderCircle, Play, Square } from 'lucide-react'
import type { TestSuite } from '@shared/types/suite'
import { PanelTabs, type PanelTab } from '@/components/PanelTabs'
import { Button } from '@/components/ui/button'
import { useSuiteStore } from '@/stores/suite-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { RunHistory } from './RunHistory'
import { LatestRun } from './RunReport'
import { runSuite, stopSuite } from './run-suite'
import { SuiteItemsPanel } from './SuiteItemsPanel'

type SuiteTab = 'items' | 'results' | 'history'

interface SuiteViewProps {
  suite: TestSuite
  tab: SuiteTab
  setTab: (tab: SuiteTab) => void
}

const SECTION_CLASS = 'flex min-h-0 flex-1 flex-col border-t-2 border-t-primary'

export function SuiteEditor({ suiteId }: { suiteId: string }) {
  const suite = useSuiteStore((state) => state.suites.find((candidate) => candidate.id === suiteId))
  const [tab, setTab] = useState<SuiteTab>('items')
  useEffect(() => void useSuiteStore.getState().loadHistory(suiteId), [suiteId])
  if (!suite) return null
  return (
    <section aria-label={`${suite.name} suite`} className={SECTION_CLASS}>
      <SuiteHeader suite={suite} tab={tab} setTab={setTab} />
      <SuiteTabs suite={suite} tab={tab} setTab={setTab} />
    </section>
  )
}

function SuiteHeader({ suite, setTab }: SuiteViewProps) {
  const environment = useWorkspaceStore((state) =>
    state.environments.find((env) => env.id === state.activeEnvironmentId)
  )
  return (
    <div className="flex items-center gap-3 border-b px-3 py-2">
      <FlaskConical className="size-4 text-muted-foreground" />
      <h2 className="truncate text-sm font-semibold">{suite.name}</h2>
      <span className="text-xs text-muted-foreground">Environment: {environment?.name ?? 'none'}</span>
      <RunButton suite={suite} onRun={() => setTab('results')} />
    </div>
  )
}

/** Running switches to the results, so the run can be followed as it happens. */
function RunButton({ suite, onRun }: { suite: TestSuite; onRun: () => void }) {
  const live = useSuiteStore((state) => state.live[suite.id])
  if (live) return <StopButton suiteId={suite.id} progress={`${live.results.length}/${live.total}`} />
  const run = (): void => {
    onRun()
    void runSuite(suite.id)
  }
  return (
    <Button variant="primary" className="ml-auto" disabled={suite.items.length === 0} onClick={run}>
      <Play /> Run suite
    </Button>
  )
}

function StopButton({ suiteId, progress }: { suiteId: string; progress: string }) {
  return (
    <Button className="ml-auto" aria-label="Stop run" onClick={() => stopSuite(suiteId)}>
      <LoaderCircle className="animate-spin" /> {`Running ${progress}`} <Square className="fill-current" /> Stop
    </Button>
  )
}

function SuiteTabs({ suite, tab, setTab }: SuiteViewProps) {
  const runs = useSuiteStore((state) => state.history[suite.id]?.length ?? 0)
  const tabs: PanelTab[] = [
    { value: 'items', label: `Requests ${suite.items.length}`, content: <SuiteItemsPanel suite={suite} /> },
    { value: 'results', label: 'Results', content: <LatestRun suiteId={suite.id} /> },
    { value: 'history', label: runs > 0 ? `History ${runs}` : 'History', content: <RunHistory suiteId={suite.id} /> }
  ]
  return <PanelTabs tabs={tabs} value={tab} onValueChange={(value) => setTab(value as SuiteTab)} />
}
