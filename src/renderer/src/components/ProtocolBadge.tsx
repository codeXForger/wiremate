import { PROTOCOL_METADATA } from '@shared/protocols/metadata'
import type { ProtocolId } from '@shared/types/protocol'
import { cn } from '@/lib/utils'
import { wireColor } from './wire'

interface ProtocolBadgeProps {
  protocol: ProtocolId
  className?: string
}

export function ProtocolBadge({ protocol, className }: ProtocolBadgeProps) {
  const style = { color: wireColor(protocol) }
  return (
    <span className={cn('inline-block w-9 shrink-0 font-mono text-[10px] font-medium', className)} style={style}>
      {PROTOCOL_METADATA[protocol].short}
    </span>
  )
}
