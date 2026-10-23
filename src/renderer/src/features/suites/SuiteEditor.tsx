import { useEffect } from 'react'
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

export function SuiteEditor({ suiteId }: { suiteId: string }) {
  const suite = useSuiteStore((state) => state.suites.find((candidate) => candidate.id === suiteId))
  useEffect(() => void useSuiteStore.getState().loadHistory(suiteId), [suiteId])
  if (!suite) return null
  return (
    <section aria-label={`${suite.name} suite`} className="flex min-h-0 flex-1 flex-col border-t-2 border-t-primary">
      <SuiteHeader suite={suite} />
      <SuiteTabs suite={suite} />
    </section>
  )
}

function SuiteHeader({ suite }: { suite: TestSuite }) {
  const environment = useWorkspaceStore((state) =>
    state.environments.find((env) => env.id === state.activeEnvironmentId)
  )
  return (
    <div className="flex items-center gap-3 border-b px-3 py-2">
      <FlaskConical className="size-4 text-muted-foreground" />
      <h2 className="truncate text-sm font-semibold">{suite.name}</h2>
      <span className="text-xs text-muted-foreground">Environment: {environment?.name ?? 'none'}</span>
      <RunButton suite={suite} />
    </div>
  )
}

function RunButton({ suite }: { suite: TestSuite }) {
  const live = useSuiteStore((state) => state.live[suite.id])
  if (live) return <StopButton suiteId={suite.id} progress={`${live.results.length}/${live.total}`} />
  return (
    <Button
      variant="primary"
      className="ml-auto"
      disabled={suite.items.length === 0}
      onClick={() => void runSuite(suite.id)}
    >
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

function SuiteTabs({ suite }: { suite: TestSuite }) {
  const runs = useSuiteStore((state) => state.history[suite.id]?.length ?? 0)
  const tabs: PanelTab[] = [
    { value: 'items', label: `Requests ${suite.items.length}`, content: <SuiteItemsPanel suite={suite} /> },
    { value: 'results', label: 'Results', content: <LatestRun suiteId={suite.id} /> },
    { value: 'history', label: runs > 0 ? `History ${runs}` : 'History', content: <RunHistory suiteId={suite.id} /> }
  ]
  return <PanelTabs tabs={tabs} />
}
