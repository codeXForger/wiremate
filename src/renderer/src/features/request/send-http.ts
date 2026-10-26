import type { RequestDocument } from '@shared/types/protocol'
import { createId } from '@shared/utils/id'
import { services } from '@/services'
import type { PipelineResult } from '@/services/request-pipeline'
import { useConsoleStore } from '@/stores/console-store'
import { useHistoryStore } from '@/stores/history-store'
import { useResponseStore } from '@/stores/response-store'
import {
  activeEnvironmentName,
  activeVariables,
  hasActiveEnvironment,
  storeVariables
} from '../environments/active-variables'
import { historyEntry, type SentRequest } from '../history/history-entry'

const SESSION_NOTE = 'No environment is active, so variables set by scripts are kept for this session only'

/** Writes a pipeline run's console output and variable changes to the stores. */
export function recordRun(result: Pick<PipelineResult, 'logs' | 'variables'>): void {
  const { append } = useConsoleStore.getState()
  append(result.logs)
  if (storeVariables(result.variables) && !hasActiveEnvironment()) {
    append([{ id: createId('log'), at: Date.now(), source: 'system', level: 'warn', message: SESSION_NOTE }])
  }
}

function sentRequest(request: RequestDocument<'http'>): SentRequest {
  const environmentName = activeEnvironmentName()
  return { category: 'api', requestId: request.id, requestName: request.name, environmentName, at: Date.now() }
}

/** Sends in progress, by request id. */
const inFlight = new Map<string, AbortController>()

/** Runs an HTTP request through the pipeline and shows its response. */
export async function sendHttpRequest(request: RequestDocument<'http'>): Promise<void> {
  const controller = new AbortController()
  inFlight.set(request.id, controller)
  useResponseStore.getState().setPending(request.id)
  const input = { name: request.name, config: request.config, variables: activeVariables() }
  const sent = sentRequest(request)
  const result = await services.pipeline.run(input, controller.signal).finally(() => inFlight.delete(request.id))
  recordRun(result)
  useHistoryStore.getState().record(historyEntry(sent, result))
  useResponseStore.getState().setResponse(request.id, result.response)
}

/** Cancels the request's send, if one is in progress. */
export function cancelHttpRequest(requestId: string): void {
  inFlight.get(requestId)?.abort()
}
