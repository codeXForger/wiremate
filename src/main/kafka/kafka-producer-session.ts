import { ProduceAcks, Producer, type MessageToProduce } from '@platformatic/kafka'
import type { KafkaOutgoing, KafkaRecordMeta, KafkaSessionSpec } from '@shared/types/kafka'
import type { KafkaAcks } from '@shared/types/protocol'
import { KafkaClientSession, type KafkaEmit } from './kafka-session'

const ACKS: Record<KafkaAcks, number> = {
  all: ProduceAcks.ALL,
  leader: ProduceAcks.LEADER,
  none: ProduceAcks.NO_RESPONSE
}

function toMessage({ topic, key, value, headers, partition }: KafkaOutgoing): MessageToProduce {
  return {
    topic,
    value: Buffer.from(value),
    ...(key !== '' && { key: Buffer.from(key) }),
    ...(partition !== undefined && { partition }),
    headers: new Map(headers.map((header) => [Buffer.from(header.key), Buffer.from(header.value)]))
  }
}

/** A producer: connects once, then writes each record it is given and reports where the broker put it. */
export class KafkaProducerSession extends KafkaClientSession {
  private readonly producer: Producer

  public constructor(spec: KafkaSessionSpec, emit: KafkaEmit) {
    super(spec, emit)
    const { acks, compression, idempotent } = spec
    this.producer = new Producer({ ...this.baseOptions(), acks: ACKS[acks], compression, idempotent })
    void this.connect()
  }

  public produce(message: KafkaOutgoing): void {
    const timestamp = Date.now()
    this.producer
      .send({ messages: [{ ...toMessage(message), timestamp: BigInt(timestamp) }] })
      .then(({ offsets }) => this.sent(message, { ...offsets?.[0], timestamp }))
      .catch((error: unknown) => this.fail(error))
  }

  protected shutdown(): Promise<void> {
    return this.producer.close()
  }

  protected closedMessage(): string {
    return 'Disconnected'
  }

  private async connect(): Promise<void> {
    try {
      const { id, brokers } = await this.producer.metadata({ topics: [] })
      const count = brokers.size === 1 ? '1 broker' : `${brokers.size} brokers`
      this.emit({ kind: 'open', message: `Connected to ${this.spec.brokers} (cluster ${id}, ${count})` })
    } catch (error) {
      this.failAndClose(error)
    }
  }

  private sent(message: KafkaOutgoing, placed: { partition?: number; offset?: bigint; timestamp: number }): void {
    const record: KafkaRecordMeta = {
      topic: message.topic,
      partition: placed.partition ?? message.partition ?? -1,
      offset: placed.offset?.toString() ?? '',
      key: message.key === '' ? null : message.key,
      headers: message.headers,
      timestamp: placed.timestamp
    }
    this.emit({ kind: 'out', record, bytes: new TextEncoder().encode(message.value) })
  }
}
