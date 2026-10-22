import { ResizableGroup, ResizableHandle, ResizablePanel } from '@/components/ui/resizable'
import { ActivityBar } from './ActivityBar'
import { MainArea } from './MainArea'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { TitleBar } from './TitleBar'

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        <Workbench />
      </div>
      <StatusBar />
    </div>
  )
}

function Workbench() {
  return (
    <ResizableGroup>
      <ResizablePanel defaultSize="22" minSize="200px" maxSize="40" className="bg-panel">
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel minSize="40">
        <MainArea />
      </ResizablePanel>
    </ResizableGroup>
  )
}
