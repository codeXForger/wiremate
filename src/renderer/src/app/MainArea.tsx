import { RequestWorkbench } from '@/features/request/RequestWorkbench'
import { TabBar } from '@/features/tabs/TabBar'
import { EmptyEditor } from './EmptyEditor'
import { useTabStore } from '@/stores/tab-store'

export function MainArea() {
  const activeId = useTabStore((state) => state.activeId)
  return (
    <main className="flex h-full flex-col">
      <TabBar />
      {activeId ? <RequestWorkbench key={activeId} requestId={activeId} /> : <EmptyEditor />}
    </main>
  )
}
