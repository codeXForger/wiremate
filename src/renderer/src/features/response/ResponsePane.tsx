import type { InteractionStyle } from '@shared/protocols/metadata'
import { PROTOCOL_METADATA } from '@shared/protocols/metadata'
import { Hint } from '@/components/Hint'
import { useResponseStore } from '@/stores/response-store'
import { useRequest } from '../request/use-request'
import { ExchangeView } from './ExchangeView'
import { PendingResponse } from './PendingResponse'
import { StreamTimeline } from './StreamTimeline'

const EMPTY_HINT: Record<InteractionStyle, string> = {
  exchange: 'Send the request to see the response here.',
  stream: 'Connect to start a session. Messages appear here as they flow.'
}

export function ResponsePane({ requestId }: { requestId: string }) {
  const request = useRequest(requestId)
  const response = useResponseStore((state) => state.responses[requestId])
  const pending = useResponseStore((state) => state.pendingIds.includes(requestId))
  if (!request) return null
  if (pending) return <PendingResponse requestId={requestId} />
  if (!response) return <Hint className="p-4">{EMPTY_HINT[PROTOCOL_METADATA[request.protocol].style]}</Hint>
  if (response.kind === 'exchange') return <ExchangeView response={response} />
  return <StreamTimeline requestId={requestId} session={response} />
}
