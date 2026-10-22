import { FolderTree, History, Settings, Variable, type LucideIcon } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { cn } from '@/lib/utils'
import { useUiStore, type SidebarView } from '@/stores/ui-store'

interface ActivityItem {
  view: SidebarView
  label: string
  icon: LucideIcon
}

const ITEMS: ActivityItem[] = [
  { view: 'explorer', label: 'Requests', icon: FolderTree },
  { view: 'environments', label: 'Environments', icon: Variable },
  { view: 'history', label: 'History', icon: History },
  { view: 'settings', label: 'Settings', icon: Settings }
]

export function ActivityBar() {
  return (
    <nav aria-label="Views" className="flex w-11 shrink-0 flex-col items-center gap-1 border-r bg-panel py-2">
      {ITEMS.map((item) => (
        <ActivityButton key={item.view} {...item} />
      ))}
    </nav>
  )
}

function ActivityButton({ view, label, icon }: ActivityItem) {
  const active = useUiStore((state) => state.view === view)
  const setView = useUiStore((state) => state.setView)
  const className = cn('size-8', active && 'bg-surface text-foreground shadow-[inset_2px_0_0_var(--primary)]')
  return (
    <IconButton
      label={label}
      icon={icon}
      side="right"
      aria-pressed={active}
      className={className}
      onClick={() => setView(view)}
    />
  )
}
