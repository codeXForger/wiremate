import type { KafkaEventBody, KafkaHeader, KafkaOutgoing, KafkaSessionSpec } from '@shared/types/kafka'
import type { LiveSession } from '../sessions/session-manager'
import { KafkaClientOptions } from './kafka-client-options'
import { describeKafkaError } from './kafka-errors'

/** Reports what happens on a producer or consumer. */
export type KafkaEmit = (event: KafkaEventBody) => void

/** A Kafka producer or consumer kept open for the renderer. */
export interface KafkaSession extends LiveSession {
  produce(message: KafkaOutgoing): void
}

/** What producers and consumers share: one client, closed once, with a single `close` event at the end. */
export abstract class KafkaClientSession implements KafkaSession {
  private closing = false

  protected constructor(
    protected readonly spec: KafkaSessionSpec,
    protected readonly emit: KafkaEmit
  ) {}

  public abstract produce(message: KafkaOutgoing): void

  public close(): void {
    if (this.closing) return
    this.closing = true
    void this.shutdown()
      .catch((error: unknown) => this.fail(error))
      .finally(() => this.emit({ kind: 'close', message: this.closedMessage() }))
  }

  protected get closed(): boolean {
    return this.closing
  }

  protected baseOptions(): ReturnType<typeof KafkaClientOptions.base> {
    return KafkaClientOptions.base(this.spec)
  }

  protected fail(error: unknown): void {
    this.emit({ kind: 'error', message: describeKafkaError(error) })
  }

  /** Reports a failure that ends the session, unless it is already closing. */
  protected failAndClose(error: unknown): void {
    if (this.closing) return
    this.fail(error)
    this.close()
  }

  protected abstract shutdown(): Promise<void>

  protected abstract closedMessage(): string
}

export function toHeaders(entries: Iterable<[Buffer, Buffer]>): KafkaHeader[] {
  return [...entries].map(([key, value]) => ({ key: key.toString(), value: value.toString() }))
}
