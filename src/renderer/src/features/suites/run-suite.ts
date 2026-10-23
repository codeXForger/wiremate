import { services } from '@/services'
import type { TestSuite } from '@shared/types/suite'
import type { StepListener, SuiteRunInput } from '@/services/suite-runner'
import { useSuiteStore } from '@/stores/suite-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { activeVariables } from '../environments/active-variables'
import { recordRun } from '../request/send-http'
import { expandSuite } from './suite-steps'

function recordStep(suiteId: string): StepListener {
  return (result, output) => {
    if (output) recordRun(output)
    useSuiteStore.getState().addResult(suiteId, result)
  }
}

function environmentName(): string | null {
  const { environments, activeEnvironmentId } = useWorkspaceStore.getState()
  return environments.find((env) => env.id === activeEnvironmentId)?.name ?? null
}

/** Runs in progress, by suite id. */
const running = new Map<string, AbortController>()

/** Stops a running suite: cancels the request in flight and skips the rest. */
export function stopSuite(suiteId: string): void {
  running.get(suiteId)?.abort()
}

function startRun(suite: TestSuite): SuiteRunInput {
  const steps = expandSuite(suite.items, useWorkspaceStore.getState())
  useSuiteStore.getState().startRun(suite.id, steps.length)
  const controller = new AbortController()
  running.set(suite.id, controller)
  return { suite, steps, variables: activeVariables(), environmentName: environmentName(), signal: controller.signal }
}

/** Runs a suite against the active environment, showing progress live and saving the run to its history. */
export async function runSuite(suiteId: string): Promise<void> {
  const store = useSuiteStore.getState()
  const suite = store.suites.find((candidate) => candidate.id === suiteId)
  if (!suite || store.live[suiteId]) return
  const input = startRun(suite)
  const run = await services.suiteRunner.run(input, recordStep(suiteId)).finally(() => running.delete(suiteId))
  useSuiteStore.getState().finishRun(run)
}
