import { OptionSelect } from '../../request/components/OptionSelect'
import type { Bound } from '../../request/use-field-binder'
import { useStreamSession } from '../../request/use-request-actions'
import type { ModeCopy } from './socket-copy'

interface ModeToolbarProps<M extends string> extends Bound<M> {
  requestId: string
  modes: readonly M[]
  copy: Record<M, ModeCopy>
}

/** Picks what the socket is (client or server, unicast or multicast…). Locked while it is open. */
export function ModeToolbar<M extends string>(props: ModeToolbarProps<M>) {
  return (
    <div className="flex items-center gap-3 border-b px-3 py-2">
      <ModeSelect {...props} />
      <span className="truncate text-xs text-muted-foreground">{props.copy[props.value].hint}</span>
    </div>
  )
}

function ModeSelect<M extends string>({ requestId, modes, copy, ...mode }: ModeToolbarProps<M>) {
  const session = useStreamSession(requestId)
  const locked = (session?.connected ?? false) || (session?.connecting ?? false)
  const format = (m: M): string => copy[m].label
  return (
    <OptionSelect label="Mode" className="w-36 text-xs" options={modes} format={format} disabled={locked} {...mode} />
  )
}
