// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { PROTOCOL_DEFAULTS } from '@shared/protocols/defaults'
import { kafkaConnection } from '@shared/kafka/kafka-text'
import type { KafkaAdminAction, KafkaAdminRequest, KafkaEvent, KafkaSessionSpec } from '@shared/types/kafka'
import type { KafkaConfig } from '@shared/types/protocol'
import { KafkaAdminService } from './admin/kafka-admin-service'
import { describeKafkaError } from './kafka-errors'
import { KafkaManager } from './kafka-manager'

/** Set to a running cluster (`localhost:9092`) to run the tests that talk to Kafka. */
const BROKERS = process.env['KAFKA_BROKERS']

const containing = (part: string) => expect.stringContaining(part) as string

class Recorder {
  public readonly events: KafkaEvent[] = []
  private waiters: (() => void)[] = []

  public readonly sink = (event: KafkaEvent): void => {
    this.events.push(event)
    this.waiters.forEach((wake) => wake())
  }

  public async until(match: (event: KafkaEvent) => boolean): Promise<KafkaEvent> {
    for (;;) {
      const found = this.events.find(match)
      if (found) return found
      await new Promise<void>((resolve) => this.waiters.push(resolve))
    }
  }

  public kind(kind: KafkaEvent['kind']): Promise<KafkaEvent> {
    return this.until((event) => event.kind === kind)
  }
}

function config(patch: Partial<KafkaConfig> = {}): KafkaConfig {
  return { ...PROTOCOL_DEFAULTS.kafka(), brokers: BROKERS ?? 'localhost:9092', ...patch }
}

const admin = new KafkaAdminService()

async function run<A extends KafkaAdminAction>(request: KafkaAdminRequest<A>, patch: Partial<KafkaConfig> = {}) {
  const outcome = await admin.run(kafkaConnection(config(patch)), request)
  if (!outcome.ok) throw new Error(outcome.error)
  return outcome.value
}

describe('describeKafkaError', () => {
  it('flattens nested errors into one line without repeats or wrappers', () => {
    const inner = new Error('Connection to localhost:1 failed')
    const error = new AggregateError(
      [new AggregateError([inner], 'Cannot connect to any broker.'), inner],
      'Listing topics failed.'
    )
    expect(describeKafkaError(error)).toBe(
      'Listing topics failed. Cannot connect to any broker. Connection to localhost:1 failed.'
    )
  })

  it("prefers the broker's own message to the library's wrapper", () => {
    const wrapper = Object.assign(new Error('Received response with error while executing API CreatePartitions(v3)'), {
      response: { results: [{ errorCode: 37, errorMessage: 'Topic already has 3 partitions.' }] }
    })
    const error = new AggregateError([wrapper], 'Creating partitions failed.')
    expect(describeKafkaError(error)).toBe('Creating partitions failed. Topic already has 3 partitions.')
    expect(describeKafkaError('plain')).toBe('plain.')
  })
})

describe('KafkaAdminService without a cluster', () => {
  it('answers with what went wrong instead of throwing', async () => {
    const outcome = await admin.run(kafkaConnection(config({ brokers: 'localhost:1' })), { action: 'listTopics' })
    expect(outcome).toEqual({ ok: false, error: containing('localhost:1') })
    expect(await admin.run(kafkaConnection(config({ brokers: ' , ' })), { action: 'cluster' })).toEqual({
      ok: false,
      error: 'Add at least one broker, e.g. localhost:9092.'
    })
  })
})

describe('KafkaManager without a cluster', () => {
  it('refuses a consumer without topics or group, and a producer that cannot connect', async () => {
    const manager = new KafkaManager(() => 5)
    const consumer = new Recorder()
    manager.open('c', { ...config({ topic: ' ' }), mode: 'consumer' }, consumer.sink)
    expect(await consumer.kind('error')).toMatchObject({ message: containing('Add a topic') })
    expect(await consumer.kind('close')).toMatchObject({ message: 'Could not start the Kafka client', at: 5 })

    const producer = new Recorder()
    manager.open('p', { ...config({ brokers: 'localhost:1' }), mode: 'producer' }, producer.sink)
    expect(await producer.kind('error')).toMatchObject({ message: containing('localhost:1') })
    expect(await producer.kind('close')).toMatchObject({ message: 'Disconnected' })
  })
})

describe.skipIf(!BROKERS)('Kafka against a real cluster', () => {
  const topic = `wiremate-test-${Date.now()}`
  const groupId = `${topic}-group`
  const manager = new KafkaManager()

  afterAll(async () => {
    manager.closeAll()
    await admin.run(kafkaConnection(config()), { action: 'deleteTopic', topic })
  })

  it('creates, grows, configures and describes a topic', async () => {
    const created = await run({
      action: 'createTopic',
      topic,
      partitions: 2,
      replicas: 1,
      configs: [{ key: 'retention.ms', value: '3600000' }]
    })
    expect(created).toMatchObject({ name: topic, partitions: 2, replicas: 1 })
    expect(await run({ action: 'listTopics' })).toContainEqual({
      name: topic,
      partitions: 2,
      replicas: 1,
      internal: false
    })
    await run({ action: 'addPartitions', topic, count: 3 })
    await run({ action: 'alterTopicConfig', topic, name: 'cleanup.policy', value: 'compact,delete' })

    const details = await run({ action: 'describeTopic', topic })
    expect(details.partitions).toHaveLength(3)
    expect(details.partitions[0]).toMatchObject({ partition: 0, earliest: '0', latest: '0', replicas: [1], isr: [1] })
    const setting = (name: string) => details.configs.find((entry) => entry.name === name)
    expect(setting('retention.ms')).toMatchObject({ value: '3600000', overridden: true })
    expect(setting('cleanup.policy')).toMatchObject({ value: 'compact,delete', overridden: true })

    await run({ action: 'alterTopicConfig', topic, name: 'cleanup.policy', value: null })
    const reset = await run({ action: 'describeTopic', topic })
    expect(reset.configs.find((entry) => entry.name === 'cleanup.policy')).toMatchObject({
      value: 'delete',
      overridden: false
    })
    expect((await run({ action: 'cluster' })).brokers.length).toBeGreaterThan(0)
  })

  it('produces records with keys and headers, and a consumer reads them back', async () => {
    const producer = new Recorder()
    manager.open('producer', { ...config({ topic }), mode: 'producer' }, producer.sink)
    expect(await producer.kind('open')).toMatchObject({ message: containing('Connected to') })
    manager.produce('producer', {
      topic,
      key: 'order-1',
      value: 'first',
      headers: [{ key: 'source', value: 'test' }],
      partition: 1
    })
    manager.produce('producer', { topic, key: '', value: 'second', headers: [], partition: 1 })
    await producer.until(() => producer.events.filter((event) => event.kind === 'out').length === 2)
    const sent = producer.events.filter((event) => event.kind === 'out')
    expect(sent.map((event) => event.kind === 'out' && event.record)).toEqual([
      expect.objectContaining({ partition: 1, offset: '0', key: 'order-1' }),
      expect.objectContaining({ partition: 1, offset: '1', key: null })
    ])

    const consumer = new Recorder()
    const spec: KafkaSessionSpec = {
      ...config({ topic, groupId, startFrom: 'earliest', maxMessages: 2 }),
      mode: 'consumer'
    }
    manager.open('consumer', spec, consumer.sink)
    expect(await consumer.kind('close')).toMatchObject({ message: 'Stopped consuming after 2 records' })
    const received = consumer.events.flatMap((event) => (event.kind === 'in' ? [event] : []))
    expect(received.map((event) => new TextDecoder().decode(event.bytes))).toEqual(['first', 'second'])
    expect(received[0]?.record).toMatchObject({
      topic,
      partition: 1,
      offset: '0',
      key: 'order-1',
      headers: [{ key: 'source', value: 'test' }]
    })
    expect(consumer.events.find((event) => event.kind === 'info')).toMatchObject({
      message: containing(`${topic}[0,1,2]`)
    })

    manager.produce('consumer', { topic, key: '', value: 'x', headers: [] })
    manager.close('producer')
    await producer.kind('close')
  })

  it("shows a group's lag, moves its offsets and deletes it", async () => {
    const groups = await run({ action: 'listGroups' })
    expect(groups.find((group) => group.id === groupId)).toMatchObject({ protocolType: 'consumer' })
    const group = await run({ action: 'describeGroup', groupId })
    expect(group.offsets).toContainEqual({ topic, partition: 1, committed: '2', latest: '2', lag: '0' })

    const rewound = await run({ action: 'resetOffsets', groupId, topic, target: 'earliest', value: '' })
    expect(rewound.find((offset) => offset.partition === 1)).toMatchObject({ committed: '0', lag: '2' })
    const exact = await run({ action: 'resetOffsets', groupId, topic, target: 'offset', value: '1' })
    expect(exact.find((offset) => offset.partition === 1)).toMatchObject({ committed: '1', lag: '1' })
    const later = await run({
      action: 'resetOffsets',
      groupId,
      topic,
      target: 'timestamp',
      value: String(Date.now() + 60_000)
    })
    expect(later.find((offset) => offset.partition === 1)).toMatchObject({ committed: '2', lag: '0' })

    await run({ action: 'deleteGroupOffsets', groupId, topic })
    expect((await run({ action: 'describeGroup', groupId })).offsets).toEqual([])
    await run({ action: 'deleteGroup', groupId })
    expect((await run({ action: 'listGroups' })).some((entry) => entry.id === groupId)).toBe(false)
  })

  it('deletes the oldest records of a partition', async () => {
    expect(await run({ action: 'deleteRecords', topic, partition: 1, before: '1' })).toEqual({ lowWatermark: '1' })
    const details = await run({ action: 'describeTopic', topic })
    expect(details.partitions[1]).toMatchObject({ earliest: '1', latest: '2' })
  })

  it('starts a consumer at a time', async () => {
    const consumer = new Recorder()
    const startTimestamp = '2000-01-01T00:00:00Z'
    const spec: KafkaSessionSpec = {
      ...config({ topic, groupId: `${groupId}-time`, startFrom: 'timestamp', startTimestamp, maxMessages: 1 }),
      mode: 'consumer'
    }
    manager.open('timed', spec, consumer.sink)
    const first = await consumer.kind('in')
    expect(first.kind === 'in' && first.record).toMatchObject({ partition: 1, offset: '1' })
    await consumer.kind('close')
    await run({ action: 'deleteGroup', groupId: `${groupId}-time` })
  })

  it('reports what the cluster refuses', async () => {
    await expect(run({ action: 'describeTopic', topic: `${topic}-missing` })).rejects.toThrow(
      /does not exist|nknown topic/
    )
    await expect(run({ action: 'addPartitions', topic, count: 1 })).rejects.toThrow(/partition/i)
    await expect(run({ action: 'resetOffsets', groupId, topic, target: 'offset', value: 'abc' })).rejects.toThrow(
      'not a whole number'
    )
  })
})
