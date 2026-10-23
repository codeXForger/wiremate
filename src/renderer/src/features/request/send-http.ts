import type { RequestDocument } from '@shared/types/protocol'
import { createId } from '@shared/utils/id'
import { services } from '@/services'
import type { PipelineResult } from '@/services/request-pipeline'
import { useConsoleStore } from '@/stores/console-store'
import { useResponseStore } from '@/stores/response-store'
import { activeVariables, hasActiveEnvironment, storeVariables } from '../environments/active-variables'

const SESSION_NOTE = 'No environment is active, so variables set by scripts are kept for this session only'

/** Writes a pipeline run's console output and variable changes to the stores. */
export function recordRun(result: Pick<PipelineResult, 'logs' | 'variables'>): void {
  const { append } = useConsoleStore.getState()
  append(result.logs)
  if (storeVariables(result.variables) && !hasActiveEnvironment()) {
    append([{ id: createId('log'), at: Date.now(), source: 'system', level: 'warn', message: SESSION_NOTE }])
  }
}

/** Runs an HTTP request through the pipeline and shows its response. */
export async function sendHttpRequest(request: RequestDocument<'http'>): Promise<void> {
  useResponseStore.getState().setPending(request.id)
  const input = { name: request.name, config: request.config, variables: activeVariables() }
  const result = await services.pipeline.run(input)
  recordRun(result)
  useResponseStore.getState().setResponse(request.id, result.response)
}
