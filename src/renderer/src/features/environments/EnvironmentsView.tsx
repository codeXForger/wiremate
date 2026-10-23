import { Plus } from 'lucide-react'
import type { KeyValue } from '@shared/types/protocol'
import type { Environment } from '@shared/types/workspace'
import { Column } from '@/components/Column'
import { Hint } from '@/components/Hint'
import { IconButton } from '@/components/IconButton'
import { SidebarHeader } from '@/components/SidebarHeader'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { KeyValueTable } from '../request/components/KeyValueTable'

export function EnvironmentsView() {
  const { environments, activeEnvironmentId, addEnvironment } = useWorkspaceStore()
  const active = environments.find((env) => env.id === activeEnvironmentId)
  const add = (): void => addEnvironment(`Environment ${environments.length + 1}`)
  return (
    <Column>
      <SidebarHeader title="Environments">
        <IconButton label="New environment" icon={Plus} onClick={add} />
      </SidebarHeader>
      {active ? <VariableEditor environment={active} /> : <Hint>Pick an environment in the title bar to edit it.</Hint>}
    </Column>
  )
}

function VariableEditor({ environment }: { environment: Environment }) {
  const updateEnvironment = useWorkspaceStore((state) => state.updateEnvironment)
  const rows = {
    value: environment.variables,
    onChange: (variables: KeyValue[]) => updateEnvironment(environment.id, { variables })
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Hint className="pb-0">
        Variables in {environment.name}. Reference them as {'{{name}}'} in any field.
      </Hint>
      <KeyValueTable label="Variable" highlightVariables={false} {...rows} />
    </div>
  )
}
