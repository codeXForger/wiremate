import type { ReactNode } from 'react'
import { ResizableGroup, ResizableHandle, ResizablePanel } from '@/components/ui/resizable'
import { ConsolePanel } from '@/features/console/ConsolePanel'
import { EnvironmentEditor } from '@/features/environments/EnvironmentEditor'
import { RequestWorkbench } from '@/features/request/RequestWorkbench'
import { SuiteEditor } from '@/features/suites/SuiteEditor'
import { tabKind, type TabKind } from '@/features/tabs/tab-kind'
import { TabBar } from '@/features/tabs/TabBar'
import { useConsoleStore } from '@/stores/console-store'
import { useTabStore } from '@/stores/tab-store'
import { EmptyEditor } from './EmptyEditor'

export function MainArea() {
  const consoleOpen = useConsoleStore((state) => state.open)
  if (!consoleOpen) return <Editors />
  return (
    <ResizableGroup orientation="vertical">
      <ResizablePanel minSize="30">
        <Editors />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="30" minSize="10">
        <ConsolePanel />
      </ResizablePanel>
    </ResizableGroup>
  )
}

function Editors() {
  const activeId = useTabStore((state) => state.activeId)
  return (
    <main className="flex h-full flex-col">
      <TabBar />
      {activeId ? <ActiveEditor id={activeId} /> : <EmptyEditor />}
    </main>
  )
}

const EDITORS: Record<TabKind, (id: string) => ReactNode> = {
  request: (id) => <RequestWorkbench key={id} requestId={id} />,
  suite: (id) => <SuiteEditor key={id} suiteId={id} />,
  environment: (id) => <EnvironmentEditor key={id} environmentId={id} />
}

function ActiveEditor({ id }: { id: string }) {
  return EDITORS[tabKind(id)](id)
}
