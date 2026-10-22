import { ResizableGroup, ResizableHandle, ResizablePanel } from '@/components/ui/resizable'
import { ResponsePane } from '../response/ResponsePane'
import { RequestPane } from './RequestPane'

export function RequestWorkbench({ requestId }: { requestId: string }) {
  return (
    <ResizableGroup orientation="vertical" className="min-h-0 flex-1">
      <ResizablePanel defaultSize="55" minSize="25">
        <RequestPane requestId={requestId} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel minSize="15">
        <ResponsePane requestId={requestId} />
      </ResizablePanel>
    </ResizableGroup>
  )
}
