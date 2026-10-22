import type { ComponentType } from 'react'
import { EnvironmentsView } from '@/features/environments/EnvironmentsView'
import { ExplorerView } from '@/features/explorer/ExplorerView'
import { HistoryView } from '@/features/history/HistoryView'
import { SettingsView } from '@/features/settings/SettingsView'
import { useUiStore, type SidebarView } from '@/stores/ui-store'

const VIEWS: Record<SidebarView, ComponentType> = {
  explorer: ExplorerView,
  environments: EnvironmentsView,
  history: HistoryView,
  settings: SettingsView
}

export function Sidebar() {
  const View = VIEWS[useUiStore((state) => state.view)]
  return <View />
}
