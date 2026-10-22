import { EnvironmentSelect } from '@/features/environments/EnvironmentSelect'
import { WorkspaceSwitcher } from '@/features/workspace/WorkspaceSwitcher'
import { cn } from '@/lib/utils'

// macOS draws the traffic lights inside our title bar, so leave room for them.
const TRAFFIC_LIGHT_GUTTER = window.wiremate?.platform === 'darwin' ? 'pl-20' : 'pl-3'

export function TitleBar() {
  return (
    <header
      className={cn('flex h-10 shrink-0 items-center gap-3 border-b bg-panel pr-3 drag-region', TRAFFIC_LIGHT_GUTTER)}
    >
      <span className="text-sm font-semibold tracking-tight">WireMate</span>
      <div className="no-drag">
        <WorkspaceSwitcher />
      </div>
      <div className="ml-auto no-drag">
        <EnvironmentSelect />
      </div>
    </header>
  )
}
