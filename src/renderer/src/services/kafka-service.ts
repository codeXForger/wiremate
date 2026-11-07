import type { KafkaApi } from '@shared/ipc'
import { recordLocation } from '@shared/kafka/kafka-text'
import type { KafkaEvent, KafkaOutgoing, KafkaSessionSpec } from '@shared/types/kafka'
import type { StreamSession } from '@shared/types/response'
import { LiveSessionService, type LiveSessionDeps } from './live-session-service'
import { logEvent } from './socket-events'

/** Turns what a producer or consumer reported into the session the response pane shows. */
export function applyKafkaEvent(session: StreamSession, event: KafkaEvent): StreamSession {
  if ('message' in event) return logEvent(session, event.kind, { at: event.at, data: event.message })
  const { record, bytes } = event
  const data = new TextDecoder().decode(bytes)
  return logEvent(session, event.kind, { at: event.at, data, bytes, record, peer: recordLocation(record) })
}

/** Kafka producers and consumers, opened through the main process, one per request. */
export class KafkaService extends LiveSessionService<KafkaApi, KafkaSessionSpec, KafkaOutgoing, KafkaEvent> {
  public constructor(deps: LiveSessionDeps<KafkaApi>) {
    super(
      {
        open: (api, sessionId, spec) => api.openKafka(sessionId, spec),
        send: (api, sessionId, message) => api.produceKafka(sessionId, message),
        close: (api, sessionId) => api.closeKafka(sessionId),
        subscribe: (api, listener) => api.onKafkaEvent(listener),
        apply: applyKafkaEvent,
        idPrefix: 'kafka',
        noBridge: 'Kafka needs the desktop app: the bridge to the main process is not available'
      },
      deps
    )
  }
}
