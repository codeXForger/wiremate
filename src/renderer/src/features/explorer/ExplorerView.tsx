import { FilePlus, FolderPlus } from 'lucide-react'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { SidebarHeader } from '@/components/SidebarHeader'
import { useUiStore } from '@/stores/ui-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { TreeList } from './TreeList'

export function ExplorerView() {
  const isEmpty = useWorkspaceStore((state) => state.nodes.length === 0)
  return (
    <Column>
      <ExplorerHeader />
      <div role="tree" aria-label="Requests" className="min-h-0 flex-1 overflow-auto py-1">
        {isEmpty ? <Hint>No requests yet. Create one to get started.</Hint> : <TreeList parentId={null} depth={0} />}
      </div>
    </Column>
  )
}

function ExplorerHeader() {
  const newRequest = (): void => useUiStore.getState().openDialog({ type: 'new-request', parentId: null })
  const newFolder = (): void => void useWorkspaceStore.getState().addFolder(null)
  return (
    <SidebarHeader title="Requests">
      <IconButton label="New request" icon={FilePlus} onClick={newRequest} />
      <IconButton label="New folder" icon={FolderPlus} onClick={newFolder} />
    </SidebarHeader>
  )
}
