import type { HttpMethod, ProtocolId } from '@shared/types/protocol'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ProtocolBadge } from './ProtocolBadge'
import { methodColor } from './wire'

/** Short enough to fit the badge column; the full method is in the tooltip. */
const METHOD_LABEL: Record<HttpMethod, string> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DEL',
  HEAD: 'HEAD',
  OPTIONS: 'OPT'
}

interface RequestBadgeProps {
  requestId: string
  protocol: ProtocolId
  className?: string
}

/** HTTP requests show their method (GET, POST…) so it is visible without opening them; others show the protocol. */
export function RequestBadge({ requestId, protocol, className }: RequestBadgeProps) {
  const method = useWorkspaceStore((state) => {
    const request = state.requests[requestId]
    return request?.protocol === 'http' ? request.config.method : undefined
  })
  if (!method) return <ProtocolBadge protocol={protocol} className={className} />
  return <MethodBadge method={method} className={className} />
}

export function MethodBadge({ method, className }: { method: HttpMethod; className?: string }) {
  const classes = cn('inline-block w-9 shrink-0 font-mono text-[10px] font-semibold', className)
  return (
    <span title={method} className={classes} style={{ color: methodColor(method) }}>
      {METHOD_LABEL[method]}
    </span>
  )
}
