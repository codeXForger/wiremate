import { ResizableGroup, ResizableHandle, ResizablePanel } from '@/components/ui/resizable'
import { ConsolePanel } from '@/features/console/ConsolePanel'
import { RequestWorkbench } from '@/features/request/RequestWorkbench'
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
      {activeId ? <RequestWorkbench key={activeId} requestId={activeId} /> : <EmptyEditor />}
    </main>
  )
}
