import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { SidebarHeader } from '@/components/SidebarHeader'

export function HistoryView() {
  return (
    <Column>
      <SidebarHeader title="History" />
      <Hint>Requests you send will be listed here, newest first.</Hint>
    </Column>
  )
}
