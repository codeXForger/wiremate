import type { Environment } from '@shared/types/workspace'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWorkspaceStore } from '@/stores/workspace-store'

export const NO_ENVIRONMENT = '__none__'

export function EnvironmentSelect() {
  const { environments, activeEnvironmentId, setActiveEnvironment } = useWorkspaceStore()
  const onChange = (value: string): void => setActiveEnvironment(value === NO_ENVIRONMENT ? null : value)
  return (
    <Select value={activeEnvironmentId ?? NO_ENVIRONMENT} onValueChange={onChange}>
      <SelectTrigger aria-label="Environment" className="h-7 w-40 text-xs">
        <SelectValue />
      </SelectTrigger>
      <EnvironmentOptions environments={environments} />
    </Select>
  )
}

function EnvironmentOptions({ environments }: { environments: Environment[] }) {
  const items = [{ id: NO_ENVIRONMENT, name: 'No environment' }, ...environments]
  return (
    <SelectContent>
      {items.map((env) => (
        <SelectItem key={env.id} value={env.id}>
          {env.name}
        </SelectItem>
      ))}
    </SelectContent>
  )
}
