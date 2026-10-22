import { Cloud, GitBranch } from 'lucide-react'
import { Column } from '@/components/Column'
import { SidebarHeader } from '@/components/SidebarHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUiStore } from '@/stores/ui-store'

export function SettingsView() {
  return (
    <Column>
      <SidebarHeader title="Settings" />
      <div className="flex flex-col gap-5 p-3">
        <ThemeSetting />
        <SyncSetting />
      </div>
    </Column>
  )
}

function ThemeSetting() {
  const { theme, setTheme } = useUiStore()
  const onChange = (dark: boolean): void => setTheme(dark ? 'dark' : 'light')
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="theme-toggle" className="text-[13px] text-foreground">
        Dark theme
      </Label>
      <Switch id="theme-toggle" checked={theme === 'dark'} onCheckedChange={onChange} />
    </div>
  )
}

const SYNC_PROVIDERS = [
  { name: 'GitHub', icon: GitBranch },
  { name: 'Google Drive', icon: Cloud }
]

function SyncSetting() {
  return (
    <section aria-label="Sync" className="flex flex-col gap-2">
      <h3 className="text-[13px]">Sync</h3>
      <p className="text-xs text-muted-foreground">
        Back up workspaces to GitHub or Google Drive. Sign-in comes later.
      </p>
      {SYNC_PROVIDERS.map(({ name, icon: Icon }) => (
        <Button key={name} disabled>
          <Icon /> Sign in with {name}
        </Button>
      ))}
    </section>
  )
}
