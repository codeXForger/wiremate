import { History, Settings, Variable, type LucideIcon } from 'lucide-react'
import { CATEGORIES, CATEGORY_IDS } from '@shared/protocols/categories'
import { CATEGORY_ICONS, categoryColor } from '@/features/categories/category-icons'
import { cn } from '@/lib/utils'
import { useUiStore, type SidebarView } from '@/stores/ui-store'

interface RailItem {
  view: SidebarView
  label: string
  icon: LucideIcon
  accent?: string
}

const UTILITY_ITEMS: RailItem[] = [
  { view: 'environments', label: 'Env', icon: Variable },
  { view: 'history', label: 'History', icon: History },
  { view: 'settings', label: 'Settings', icon: Settings }
]

const CATEGORY_ITEMS: RailItem[] = CATEGORY_IDS.map((id) => ({
  view: id,
  label: CATEGORIES[id].label,
  icon: CATEGORY_ICONS[id],
  accent: categoryColor(id)
}))

export function ActivityBar() {
  return (
    <nav
      aria-label="Sections"
      className="flex w-[68px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r bg-panel px-1.5 py-2"
    >
      <RailGroup items={CATEGORY_ITEMS} />
      <div className="mt-auto flex flex-col gap-0.5 border-t pt-2">
        <RailGroup items={UTILITY_ITEMS} />
      </div>
    </nav>
  )
}

function RailGroup({ items }: { items: RailItem[] }) {
  return items.map((item) => <RailButton key={item.view} {...item} />)
}

const RAIL_CLASS =
  'flex flex-col items-center gap-1 rounded-md py-2 text-[10px] leading-none text-muted-foreground hover:bg-surface hover:text-foreground'
const ACTIVE_CLASS = 'bg-surface text-foreground shadow-[inset_2px_0_0_var(--primary)]'

function RailButton({ view, label, icon: Icon, accent }: RailItem) {
  const active = useUiStore((state) => state.view === view)
  const setView = useUiStore((state) => state.setView)
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => setView(view)}
      className={cn(RAIL_CLASS, active && ACTIVE_CLASS)}
    >
      <Icon className="size-[18px]" style={active ? { color: accent } : undefined} />
      {label}
    </button>
  )
}
