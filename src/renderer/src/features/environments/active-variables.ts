import type { Environment } from '@shared/types/workspace'
import type { Variables } from '@shared/types/scripting'
import { mergeVariables, sameVariables, variablesOf } from '@shared/utils/variables'
import { useSessionVariables } from '@/stores/session-variables'
import { useWorkspaceStore } from '@/stores/workspace-store'

function activeEnvironment(): Environment | undefined {
  const { environments, activeEnvironmentId } = useWorkspaceStore.getState()
  return environments.find((env) => env.id === activeEnvironmentId)
}

/** The variables `{{placeholders}}` and scripts see: the active environment's, or the session's when none is active. */
export function activeVariables(): Variables {
  const environment = activeEnvironment()
  return environment ? variablesOf(environment.variables) : useSessionVariables.getState().variables
}

/** Writes variables changed by a script back to where they came from. Returns false when nothing changed. */
export function storeVariables(next: Variables): boolean {
  if (sameVariables(activeVariables(), next)) return false
  const environment = activeEnvironment()
  if (!environment) useSessionVariables.getState().replace(next)
  else
    useWorkspaceStore
      .getState()
      .updateEnvironment(environment.id, { variables: mergeVariables(environment.variables, next) })
  return true
}

export function hasActiveEnvironment(): boolean {
  return activeEnvironment() !== undefined
}

export function activeEnvironmentName(): string | null {
  return activeEnvironment()?.name ?? null
}
