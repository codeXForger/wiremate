import {
  Consumer,
  FetchIsolationLevels,
  type ConsumerGroupJoinPayload,
  type Message,
  type MessagesStream,
  type Offsets,
  type TopicWithPartitionAndOffset,
  type StreamOptions
} from '@platformatic/kafka'
import { formatAssignment, parseTimestamp, splitList } from '@shared/kafka/kafka-text'
import type { KafkaOutgoing, KafkaRecordMeta, KafkaSessionSpec } from '@shared/types/kafka'
import { KafkaClientSession, toHeaders, type KafkaEmit } from './kafka-session'

/** The library leaves a null key (or value) out; an empty one stays empty. */
function textOrNull(bytes: Buffer | null | undefined): string | null {
  return bytes ? bytes.toString() : null
}

/** A tombstone's value is null; it shows as empty. */
function bytesOf(bytes: Buffer | null | undefined): Buffer {
  return bytes ?? Buffer.alloc(0)
}

function toRecordMeta(message: Message): KafkaRecordMeta {
  return {
    topic: message.topic,
    partition: message.partition,
    offset: message.offset.toString(),
    key: textOrNull(message.key),
    headers: toHeaders(message.headers.entries()),
    timestamp: Number(message.timestamp)
  }
}

type Position = Pick<StreamOptions, 'mode' | 'fallbackMode' | 'offsets'>

/** A consumer in a group: reads the topics from where the user said and reports every record it gets. */
export class KafkaConsumerSession extends KafkaClientSession {
  private readonly consumer: Consumer
  private readonly topics: string[]
  private stream: MessagesStream<Buffer, Buffer, Buffer, Buffer> | undefined
  private received = 0

  public constructor(spec: KafkaSessionSpec, emit: KafkaEmit) {
    super(spec, emit)
    this.topics = splitList(spec.topic)
    if (this.topics.length === 0) throw new Error('Add a topic to consume, or several separated by commas')
    if (spec.groupId.trim() === '') throw new Error('Add a consumer group')
    this.consumer = new Consumer({
      ...this.baseOptions(),
      groupId: spec.groupId.trim(),
      sessionTimeout: spec.sessionTimeoutMs,
      maxWaitTime: spec.maxWaitMs
    })
    this.consumer.on('consumer:group:join', (payload) => this.joined(payload))
    void this.start()
  }

  public produce(_message: KafkaOutgoing): void {
    this.emit({ kind: 'error', message: 'A consumer only reads; switch the request to Producer to send' })
  }

  protected async shutdown(): Promise<void> {
    await this.stream?.close()
    await this.consumer.close()
  }

  protected closedMessage(): string {
    return `Stopped consuming after ${this.received === 1 ? '1 record' : `${this.received} records`}`
  }

  private async start(): Promise<void> {
    try {
      const stream = await this.consumer.consume({
        topics: this.topics,
        // Commits record by record (below), so a consumer that stops early never commits what it did not show.
        autocommit: false,
        isolationLevel: this.spec.readCommitted ? FetchIsolationLevels.READ_COMMITTED : undefined,
        ...(await this.position())
      })
      this.attach(stream)
    } catch (error) {
      this.failAndClose(error)
    }
  }

  private attach(stream: MessagesStream<Buffer, Buffer, Buffer, Buffer>): void {
    this.stream = stream
    if (this.closed) return void stream.close()
    const { groupId, startFrom } = this.spec
    this.emit({ kind: 'open', message: `Consuming ${this.topics.join(', ')} in group ${groupId}, from ${startFrom}` })
    stream.on('data', (message) => this.record(message))
    stream.on('error', (error) => this.failAndClose(error))
  }

  /** Where to start: a mode the library knows, or, for a time, the offset of each partition at that time. */
  private async position(): Promise<Position> {
    const { startFrom, startTimestamp } = this.spec
    if (startFrom === 'committed') return { mode: 'committed', fallbackMode: 'latest' }
    if (startFrom !== 'timestamp') return { mode: startFrom }
    const timestamp = BigInt(parseTimestamp(startTimestamp))
    const at = await this.consumer.listOffsets({ topics: this.topics, timestamp })
    const latest = await this.consumer.listOffsets({ topics: this.topics })
    return { mode: 'manual', offsets: KafkaConsumerSession.offsetsAt(at, latest) }
  }

  /** A partition with nothing written since the time starts at its end. */
  private static offsetsAt(at: Offsets, latest: Offsets): TopicWithPartitionAndOffset[] {
    return [...at].flatMap(([topic, partitions]) =>
      partitions.map((offset, partition) => ({
        topic,
        partition,
        offset: offset >= 0n ? offset : (latest.get(topic)?.[partition] ?? 0n)
      }))
    )
  }

  private commit(message: Message): void {
    Promise.resolve(message.commit()).catch((error: unknown) => this.fail(error))
  }

  private joined({ assignments }: ConsumerGroupJoinPayload): void {
    const assigned = assignments?.map(({ topic, partitions }) => formatAssignment(topic, partitions)) ?? []
    this.emit({ kind: 'info', message: `Joined the group; assigned ${assigned.join(' ') || 'no partitions'}` })
  }

  private record(message: Message): void {
    if (this.closed) return
    this.received += 1
    this.emit({ kind: 'in', record: toRecordMeta(message), bytes: new Uint8Array(bytesOf(message.value)) })
    if (this.spec.autoCommit) this.commit(message)
    if (this.spec.maxMessages > 0 && this.received >= this.spec.maxMessages) this.close()
  }
}
