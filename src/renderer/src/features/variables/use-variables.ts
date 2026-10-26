import { useMemo } from 'react'
import type { Variables } from '@shared/types/scripting'
import { variablesOf } from '@shared/utils/variables'
import { useSessionVariables } from '@/stores/session-variables'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { activeVariables, storeVariables } from '../environments/active-variables'

/** The variables `{{placeholders}}` resolve against right now; re-renders when they change. */
export function useVariables(): Variables {
  const environment = useWorkspaceStore((state) =>
    state.environments.find((env) => env.id === state.activeEnvironmentId)
  )
  const session = useSessionVariables((state) => state.variables)
  return useMemo(() => (environment ? variablesOf(environment.variables) : session), [environment, session])
}

/** Where a value set from a popover goes: the active environment, or the session when none is active. */
export function useVariableScope(): string {
  return useWorkspaceStore(
    (state) => state.environments.find((env) => env.id === state.activeEnvironmentId)?.name ?? 'this session'
  )
}

/** Sets one variable in the active environment (adding it when missing), or in the session. */
export function setVariable(name: string, value: string): void {
  storeVariables({ ...activeVariables(), [name]: value })
}
