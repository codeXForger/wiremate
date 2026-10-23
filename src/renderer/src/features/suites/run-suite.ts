import { services } from '@/services'
import { useSuiteStore } from '@/stores/suite-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { activeVariables } from '../environments/active-variables'
import { recordRun } from '../request/send-http'
import { expandSuite } from './suite-steps'

function environmentName(): string | null {
  const { environments, activeEnvironmentId } = useWorkspaceStore.getState()
  return environments.find((env) => env.id === activeEnvironmentId)?.name ?? null
}

/** Runs a suite against the active environment, showing progress live and saving the run to its history. */
export async function runSuite(suiteId: string): Promise<void> {
  const store = useSuiteStore.getState()
  const suite = store.suites.find((candidate) => candidate.id === suiteId)
  if (!suite || store.live[suiteId]) return
  const steps = expandSuite(suite.items, useWorkspaceStore.getState())
  store.startRun(suiteId, steps.length)
  const input = { suite, steps, variables: activeVariables(), environmentName: environmentName() }
  const run = await services.suiteRunner.run(input, (result, output) => {
    if (output) recordRun(output)
    useSuiteStore.getState().addResult(suiteId, result)
  })
  useSuiteStore.getState().finishRun(run)
}
