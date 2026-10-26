import type { ReactNode } from 'react'
import { PanelTabs } from '@/components/PanelTabs'
import { MessageBar } from '../../messages/MessageBar'
import type { ModeCopy } from './socket-copy'
import { SocketComposer } from './SocketComposer'

interface SocketTabsProps {
  requestId: string
  copy: ModeCopy
  /** Shown above the payload, e.g. where datagrams go. */
  destination?: ReactNode
  options: ReactNode
}

export function SocketTabs({ requestId, copy, destination, options }: SocketTabsProps) {
  const message = (
    <>
      {destination}
      <MessageBar requestId={requestId} />
      <SocketComposer requestId={requestId} defaultTarget={copy.target} />
    </>
  )
  const tabs = [
    { value: 'message', label: 'Message', className: 'flex flex-col', content: message },
    { value: 'options', label: 'Options', content: options }
  ]
  return <PanelTabs tabs={tabs} />
}
