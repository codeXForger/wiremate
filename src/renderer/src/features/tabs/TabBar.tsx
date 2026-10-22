import type { KeyboardEvent, MouseEvent } from 'react'
import { X } from 'lucide-react'
import type { AnyRequest } from '@shared/types/protocol'
import { ProtocolBadge } from '@/components/ProtocolBadge'
import { wireColor } from '@/components/wire'
import { cn } from '@/lib/utils'
import { useTabStore } from '@/stores/tab-store'
import { useRequest } from '../request/use-request'

export function TabBar() {
  const openIds = useTabStore((state) => state.openIds)
  if (openIds.length === 0) return null
  return (
    <div role="tablist" aria-label="Open requests" className="flex h-9 shrink-0 overflow-x-auto border-b bg-panel">
      {openIds.map((id) => (
        <Tab key={id} id={id} />
      ))}
    </div>
  )
}

const TAB_CLASS = 'group flex max-w-56 cursor-default items-center gap-1 border-t-2 border-r pr-1 pl-2.5 text-xs'
const TONE = { active: 'bg-background text-foreground', idle: 'text-muted-foreground hover:text-foreground' }

function useTabProps(request: AnyRequest, active: boolean) {
  const open = (): void => useTabStore.getState().open(request.id)
  return {
    role: 'tab',
    'aria-selected': active,
    tabIndex: 0,
    onClick: open,
    onKeyDown: (event: KeyboardEvent) => event.key === 'Enter' && open(),
    style: { borderTopColor: active ? wireColor(request.protocol) : 'transparent' },
    className: cn(TAB_CLASS, active ? TONE.active : TONE.idle)
  }
}

function Tab({ id }: { id: string }) {
  const request = useRequest(id)
  const active = useTabStore((state) => state.activeId === id)
  return request ? <TabContent request={request} active={active} /> : null
}

function TabContent({ request, active }: { request: AnyRequest; active: boolean }) {
  return (
    <div {...useTabProps(request, active)}>
      <ProtocolBadge protocol={request.protocol} className="w-auto" />
      <span className="truncate">{request.name}</span>
      <CloseTabButton request={request} />
    </div>
  )
}

const CLOSE_CLASS = 'ml-1 flex size-5 items-center justify-center rounded hover:bg-surface'

function CloseTabButton({ request }: { request: AnyRequest }) {
  const dirty = useTabStore((state) => state.dirtyIds.includes(request.id))
  const close = (event: MouseEvent): void => {
    event.stopPropagation()
    useTabStore.getState().close(request.id)
  }
  return (
    <button type="button" aria-label={`Close ${request.name}`} onClick={close} className={CLOSE_CLASS}>
      {dirty && <span aria-label="Unsaved changes" className="size-2 rounded-full bg-primary group-hover:hidden" />}
      <X className={cn('size-3', dirty && 'hidden group-hover:block')} />
    </button>
  )
}
