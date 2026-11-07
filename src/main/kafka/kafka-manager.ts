import type { KafkaEventBody, KafkaOutgoing, KafkaSessionSpec } from '@shared/types/kafka'
import { SessionManager } from '../sessions/session-manager'
import { KafkaConsumerSession } from './kafka-consumer-session'
import { KafkaProducerSession } from './kafka-producer-session'
import type { KafkaEmit, KafkaSession } from './kafka-session'

function createSession(spec: KafkaSessionSpec, emit: KafkaEmit): KafkaSession {
  return spec.mode === 'consumer' ? new KafkaConsumerSession(spec, emit) : new KafkaProducerSession(spec, emit)
}

/** Keeps the open producers and consumers by session id, and forgets each one once it has closed. */
export class KafkaManager extends SessionManager<KafkaSessionSpec, KafkaEventBody, KafkaSession> {
  public constructor(now: () => number = Date.now) {
    super({ create: createSession, failure: 'Could not start the Kafka client', now })
  }

  public produce(sessionId: string, message: KafkaOutgoing): void {
    this.session(sessionId)?.produce(message)
  }
}
