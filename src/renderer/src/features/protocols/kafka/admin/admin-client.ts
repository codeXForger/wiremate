import { kafkaConnection } from '@shared/kafka/kafka-text'
import { errorMessage } from '@shared/scripting/describe'
import type { KafkaAdminAction, KafkaAdminRequest, KafkaAdminResult } from '@shared/types/kafka'
import type { StreamSession } from '@shared/types/response'
import { emptySession, logEvent } from '@/services/socket-events'
import { streamSessionStore } from '@/stores/response-store'
import { activeVariables } from '../../../environments/active-variables'
import { kafkaRequest, resolveConfig } from '../kafka-actions'
import { useAdminStore } from './admin-store'

/** The admin log replaces the connection state in the response pane. */
export const ADMIN_LOG_LABEL = 'Admin activity'

function adminLog(requestId: string): StreamSession {
  const session = streamSessionStore.get(requestId)
  return { ...(session ?? emptySession()), label: ADMIN_LOG_LABEL }
}

/** Notes what an admin call did, or why it failed, in the request's response pane. */
export function logAdmin(requestId: string, kind: 'info' | 'error', message: string): void {
  streamSessionStore.set(requestId, logEvent(adminLog(requestId), kind, { at: Date.now(), data: message }))
}

const NO_BRIDGE = 'Kafka needs the desktop app: the bridge to the main process is not available'

type Done<A extends KafkaAdminAction> = (result: KafkaAdminResult<A>) => string

async function call<A extends KafkaAdminAction>(
  requestId: string,
  request: KafkaAdminRequest<A>,
  done?: Done<A>
): Promise<KafkaAdminResult<A>> {
  const bridge = window.wiremate
  const kafka = kafkaRequest(requestId)
  if (!bridge || !kafka) throw new Error(NO_BRIDGE)
  const connection = kafkaConnection(resolveConfig(kafka.config, activeVariables()))
  const outcome = await bridge.kafkaAdmin(connection, request)
  if (!outcome.ok) throw new Error(outcome.error)
  if (done) logAdmin(requestId, 'info', done(outcome.value))
  return outcome.value
}

/** Runs one admin request with the Kafka request's connection; a failure is logged, then thrown for a dialog to show. */
export async function runAdminStep<A extends KafkaAdminAction>(
  requestId: string,
  request: KafkaAdminRequest<A>,
  done?: Done<A>
): Promise<KafkaAdminResult<A>> {
  useAdminStore.getState().track(requestId, 1)
  try {
    return await call(requestId, request, done)
  } catch (error) {
    logAdmin(requestId, 'error', errorMessage(error))
    throw error
  } finally {
    useAdminStore.getState().track(requestId, -1)
  }
}

/**
 * Runs one admin request. What it did (`done`, when given) or why it failed shows in the response pane; the result
 * comes back, or undefined after a failure.
 */
export function runAdmin<A extends KafkaAdminAction>(
  requestId: string,
  request: KafkaAdminRequest<A>,
  done?: Done<A>
): Promise<KafkaAdminResult<A> | undefined> {
  return runAdminStep(requestId, request, done).catch(() => undefined)
}
