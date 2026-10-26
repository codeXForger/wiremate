import type { ComponentType } from 'react'
import { isCategoryId } from '@shared/protocols/categories'
import { CategoryView } from '@/features/categories/CategoryView'
import { EnvironmentsView } from '@/features/environments/EnvironmentsView'
import { SettingsView } from '@/features/settings/SettingsView'
import { useUiStore, type UtilityView } from '@/stores/ui-store'

const UTILITY_VIEWS: Record<UtilityView, ComponentType> = {
  environments: EnvironmentsView,
  settings: SettingsView
}

export function Sidebar() {
  const view = useUiStore((state) => state.view)
  if (isCategoryId(view)) return <CategoryView key={view} category={view} />
  const View = UTILITY_VIEWS[view]
  return <View />
}
