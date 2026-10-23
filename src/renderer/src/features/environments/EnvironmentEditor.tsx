import { Variable } from 'lucide-react'
import type { KeyValue } from '@shared/types/protocol'
import type { Environment } from '@shared/types/workspace'
import { Hint } from '@/components/Hint'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { KeyValueTable } from '../request/components/KeyValueTable'
import { ActiveBadge } from './EnvironmentsView'

const SECTION_CLASS = 'flex min-h-0 flex-1 flex-col border-t-2 border-t-primary'
const USAGE = 'Use them as {{name}} in URLs, params, headers, auth and bodies. Changes are saved as you type.'

/** An environment opened in a tab: its variables, to add, edit, switch off or delete. */
export function EnvironmentEditor({ environmentId }: { environmentId: string }) {
  const environment = useWorkspaceStore((state) => state.environments.find((env) => env.id === environmentId))
  if (!environment) return null
  return (
    <section aria-label={`${environment.name} environment`} className={SECTION_CLASS}>
      <EnvironmentHeader environment={environment} />
      <Hint className="pb-0">{USAGE}</Hint>
      <div className="min-h-0 flex-1 overflow-auto">
        <VariableTable environment={environment} />
      </div>
    </section>
  )
}

function EnvironmentHeader({ environment }: { environment: Environment }) {
  return (
    <div className="flex items-center gap-3 border-b px-3 py-2">
      <Variable className="size-4 text-muted-foreground" />
      <h2 className="truncate text-sm font-semibold">{environment.name}</h2>
      <ActiveBadge id={environment.id} />
      <UseButton id={environment.id} />
    </div>
  )
}

function UseButton({ id }: { id: string }) {
  const active = useWorkspaceStore((state) => state.activeEnvironmentId === id)
  if (active) return null
  return (
    <Button className="ml-auto" onClick={() => useWorkspaceStore.getState().setActiveEnvironment(id)}>
      Use this environment
    </Button>
  )
}

function VariableTable({ environment }: { environment: Environment }) {
  const onChange = (variables: KeyValue[]): void =>
    useWorkspaceStore.getState().updateEnvironment(environment.id, { variables })
  return <KeyValueTable label="Variable" highlightVariables={false} value={environment.variables} onChange={onChange} />
}
