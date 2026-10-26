import { wireColor } from '@/components/wire'
import { protocolRegistry } from '../protocols/registry'
import { DraftBar } from './DraftBar'
import { useRequest } from './use-request'

export function RequestPane({ requestId }: { requestId: string }) {
  const request = useRequest(requestId)
  if (!request) return null
  const { Editor, meta } = protocolRegistry.get(request.protocol)
  return (
    <section
      aria-label={`${meta.label} request`}
      className="flex h-full flex-col border-t-2"
      style={{ borderTopColor: wireColor(request.protocol) }}
    >
      <DraftBar requestId={requestId} />
      <Editor requestId={requestId} />
    </section>
  )
}
