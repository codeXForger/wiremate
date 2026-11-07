import type { KafkaApi } from '@shared/ipc'
import { formatAssignment, splitList } from '@shared/kafka/kafka-text'
import type {
  KafkaAdminAction,
  KafkaAdminActions,
  KafkaAdminOutcome,
  KafkaAdminRequest,
  KafkaConfigEntry,
  KafkaEvent,
  KafkaEventBody,
  KafkaGroupOffset,
  KafkaHeader,
  KafkaOutgoing,
  KafkaRecordMeta,
  KafkaSessionSpec
} from '@shared/types/kafka'
import type { KafkaConnection } from '@shared/types/protocol'

interface StoredRecord {
  key: string | null
  value: string
  headers: KafkaHeader[]
  timestamp: number
}

interface FakeTopic {
  /** Each partition's records, by offset; deleted ones are cut from the front, `earliest` keeps the count. */
  partitions: { earliest: number; records: StoredRecord[] }[]
  configs: Map<string, string>
}

interface FakeGroup {
  members: Set<string>
  /** `topic:partition` → the next offset to read. */
  offsets: Map<string, number>
}

/** Where a record sits. */
interface Place {
  topic: string
  partition: number
  offset: number
}

type Handlers = {
  [A in KafkaAdminAction]: (request: KafkaAdminRequest<A>) => KafkaAdminActions[A]['result']
}

const DEFAULT_CONFIGS: Record<string, string> = { 'cleanup.policy': 'delete', 'retention.ms': '604800000' }

/** A broker list with "down" in it is unreachable, to test failures. */
const UNREACHABLE = /down/

const latestOf = (partition: FakeTopic['partitions'][number]): number => partition.earliest + partition.records.length

/**
 * An in-memory stand-in for the main process's Kafka clients: one broker with topics, partitions and consumer groups.
 * Producers append records, consumers in a group receive them (from where `startFrom` says) and commit as they go,
 * and admin calls see and change the same cluster.
 */
export class FakeKafkaCluster implements KafkaApi {
  public readonly topics = new Map<string, FakeTopic>()
  public readonly groups = new Map<string, FakeGroup>()
  private readonly listeners = new Set<(event: KafkaEvent) => void>()
  private readonly sessions = new Map<string, KafkaSessionSpec>()

  public createTopic(name: string, partitions = 1): void {
    const empty = Array.from({ length: partitions }, () => ({ earliest: 0, records: [] }))
    this.topics.set(name, { partitions: empty, configs: new Map() })
  }

  public onKafkaEvent(listener: (event: KafkaEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public openKafka(sessionId: string, spec: KafkaSessionSpec): Promise<void> {
    if (UNREACHABLE.test(spec.brokers)) {
      this.emit(sessionId, { kind: 'error', message: `Cannot reach ${spec.brokers}` })
      this.emit(sessionId, { kind: 'close', message: 'Disconnected' })
      return Promise.resolve()
    }
    this.sessions.set(sessionId, spec)
    if (spec.mode === 'producer') this.emit(sessionId, { kind: 'open', message: `Connected to ${spec.brokers}` })
    else this.subscribe(sessionId, spec)
    return Promise.resolve()
  }

  public produceKafka(sessionId: string, message: KafkaOutgoing): Promise<void> {
    if (!this.topics.has(message.topic)) this.createTopic(message.topic)
    const topic = this.topics.get(message.topic)!
    const partition = message.partition ?? 0
    const target = topic.partitions[partition]
    if (!target) {
      this.emit(sessionId, { kind: 'error', message: `${message.topic} has no partition ${partition}` })
      return Promise.resolve()
    }
    const record = { key: message.key || null, value: message.value, headers: message.headers, timestamp: Date.now() }
    target.records.push(record)
    const offset = latestOf(target) - 1
    this.emit(sessionId, { kind: 'out', ...this.toEvent({ topic: message.topic, partition, offset }, record) })
    this.deliver({ topic: message.topic, partition, offset })
    return Promise.resolve()
  }

  public closeKafka(sessionId: string): Promise<void> {
    const spec = this.sessions.get(sessionId)
    if (!spec) return Promise.resolve()
    this.sessions.delete(sessionId)
    this.groups.get(spec.groupId)?.members.delete(sessionId)
    this.emit(sessionId, { kind: 'close', message: 'Disconnected' })
    return Promise.resolve()
  }

  public kafkaAdmin<A extends KafkaAdminAction>(
    connection: KafkaConnection,
    request: KafkaAdminRequest<A>
  ): Promise<KafkaAdminOutcome<A>> {
    if (UNREACHABLE.test(connection.brokers)) {
      return Promise.resolve({ ok: false, error: `Cannot reach ${connection.brokers}` })
    }
    try {
      const handle = this.handlers[request.action] as (request: KafkaAdminRequest<A>) => KafkaAdminActions[A]['result']
      return Promise.resolve({ ok: true, value: handle(request) })
    } catch (error) {
      return Promise.resolve({ ok: false, error: (error as Error).message })
    }
  }

  /** Producers and consumers still open. */
  public openSessions(): string[] {
    return [...this.sessions.keys()]
  }

  private emit(sessionId: string, body: KafkaEventBody): void {
    this.listeners.forEach((listener) => listener({ ...body, sessionId, at: Date.now() }))
  }

  private toEvent({ topic, partition, offset }: Place, record: StoredRecord) {
    const meta: KafkaRecordMeta = {
      topic,
      partition,
      offset: String(offset),
      key: record.key,
      headers: record.headers,
      timestamp: record.timestamp
    }
    return { record: meta, bytes: new TextEncoder().encode(record.value) }
  }

  private group(groupId: string): FakeGroup {
    const group = this.groups.get(groupId) ?? { members: new Set(), offsets: new Map() }
    this.groups.set(groupId, group)
    return group
  }

  private topic(name: string): FakeTopic {
    const topic = this.topics.get(name)
    if (!topic) throw new Error(`Unknown topic ${name}`)
    return topic
  }

  private subscribe(sessionId: string, spec: KafkaSessionSpec): void {
    const topics = splitList(spec.topic)
    const group = this.group(spec.groupId)
    group.members.add(sessionId)
    this.emit(sessionId, { kind: 'open', message: `Consuming ${topics.join(', ')} in group ${spec.groupId}` })
    const assigned = topics.map((name) =>
      formatAssignment(
        name,
        this.topic(name).partitions.map((_, p) => p)
      )
    )
    this.emit(sessionId, { kind: 'info', message: `Joined the group; assigned ${assigned.join(' ')}` })
    for (const name of topics) this.catchUp(sessionId, spec, name)
  }

  /** Sends a new consumer what it starts from: every kept record, the uncommitted ones, or nothing. */
  private catchUp(sessionId: string, spec: KafkaSessionSpec, name: string): void {
    const group = this.group(spec.groupId)
    this.topic(name).partitions.forEach((partition, index) => {
      const committed = group.offsets.get(`${name}:${index}`)
      const fromCommitted = committed ?? (spec.startFrom === 'earliest' ? partition.earliest : latestOf(partition))
      const start = spec.startFrom === 'earliest' ? partition.earliest : fromCommitted
      for (let offset = start; offset < latestOf(partition); offset++)
        this.send(sessionId, { topic: name, partition: index, offset })
    })
  }

  private deliver(place: Place): void {
    const readers = [...this.sessions].filter(
      ([, spec]) => spec.mode === 'consumer' && splitList(spec.topic).includes(place.topic)
    )
    const byGroup = new Map(readers.map(([id, spec]) => [spec.groupId, id]))
    byGroup.forEach((sessionId) => this.send(sessionId, place))
  }

  private send(sessionId: string, place: Place): void {
    const spec = this.sessions.get(sessionId)!
    const stored = this.topic(place.topic).partitions[place.partition]!
    const record = stored.records[place.offset - stored.earliest]!
    this.emit(sessionId, { kind: 'in', ...this.toEvent(place, record) })
    if (spec.autoCommit) this.group(spec.groupId).offsets.set(`${place.topic}:${place.partition}`, place.offset + 1)
  }

  private groupOffsets(groupId: string): KafkaGroupOffset[] {
    return [...this.group(groupId).offsets].map(([key, committed]) => {
      const [topic = '', index = '0'] = key.split(':')
      const latest = latestOf(this.topic(topic).partitions[Number(index)]!)
      const lag = String(latest - committed)
      return { topic, partition: Number(index), committed: String(committed), latest: String(latest), lag }
    })
  }

  private configs(topic: FakeTopic): KafkaConfigEntry[] {
    const names = new Set([...Object.keys(DEFAULT_CONFIGS), ...topic.configs.keys()])
    return [...names].map((name) => ({
      name,
      value: topic.configs.get(name) ?? DEFAULT_CONFIGS[name] ?? null,
      readOnly: false,
      overridden: topic.configs.has(name),
      sensitive: false
    }))
  }

  private resetTarget(request: KafkaAdminRequest<'resetOffsets'>, partition: FakeTopic['partitions'][number]): number {
    if (request.target === 'earliest') return partition.earliest
    if (request.target === 'latest') return latestOf(partition)
    if (request.target === 'offset') return Number(request.value)
    const at = partition.records.findIndex((record) => record.timestamp >= Date.parse(request.value))
    return at < 0 ? latestOf(partition) : partition.earliest + at
  }

  private readonly handlers: Handlers = {
    cluster: () => ({
      clusterId: 'fake-cluster',
      controllerId: 1,
      brokers: [{ id: 1, host: 'localhost', port: 9092, rack: null }]
    }),
    listTopics: () =>
      [...this.topics].map(([name, topic]) => ({
        name,
        partitions: topic.partitions.length,
        replicas: 1,
        internal: name.startsWith('__')
      })),
    describeTopic: ({ topic: name }) => {
      const topic = this.topic(name)
      const partitions = topic.partitions.map((partition, index) => ({
        partition: index,
        leader: 1,
        replicas: [1],
        isr: [1],
        earliest: String(partition.earliest),
        latest: String(latestOf(partition))
      }))
      return { name, id: `id-${name}`, partitions, configs: this.configs(topic) }
    },
    createTopic: ({ topic, partitions, replicas, configs }) => {
      if (this.topics.has(topic)) throw new Error(`Topic ${topic} already exists`)
      if (replicas > 1) throw new Error('Replication factor: 2 larger than available brokers: 1')
      this.createTopic(topic, partitions)
      configs.forEach(({ key, value }) => this.topic(topic).configs.set(key, value))
      return { name: topic, partitions, replicas, internal: false }
    },
    deleteTopic: ({ topic }) => {
      this.topic(topic)
      this.topics.delete(topic)
      return null
    },
    addPartitions: ({ topic, count }) => {
      const partitions = this.topic(topic).partitions
      if (count <= partitions.length) throw new Error(`Topic currently has ${partitions.length} partitions`)
      while (partitions.length < count) partitions.push({ earliest: 0, records: [] })
      return null
    },
    alterTopicConfig: ({ topic, name, value }) => {
      const configs = this.topic(topic).configs
      if (value === null) configs.delete(name)
      else configs.set(name, value)
      return null
    },
    deleteRecords: ({ topic, partition, before }) => {
      const stored = this.topic(topic).partitions[partition]!
      const cut = Math.min(Number(before), latestOf(stored)) - stored.earliest
      stored.records.splice(0, Math.max(cut, 0))
      stored.earliest += Math.max(cut, 0)
      return { lowWatermark: String(stored.earliest) }
    },
    listGroups: () =>
      [...this.groups].map(([id, g]) => ({
        id,
        state: g.members.size > 0 ? 'Stable' : 'Empty',
        protocolType: 'consumer'
      })),
    describeGroup: ({ groupId }) => {
      if (!this.groups.has(groupId)) throw new Error(`Unknown group ${groupId}`)
      const group = this.group(groupId)
      const members = [...group.members].map((id) => {
        const spec = this.sessions.get(id)!
        const assignments = splitList(spec.topic).map((name) =>
          formatAssignment(
            name,
            this.topic(name).partitions.map((_, p) => p)
          )
        )
        return { id, clientId: spec.clientId, host: '/127.0.0.1', assignments }
      })
      const state = members.length > 0 ? 'Stable' : 'Empty'
      return { id: groupId, state, protocol: 'range', members, offsets: this.groupOffsets(groupId) }
    },
    deleteGroup: ({ groupId }) => {
      if (this.group(groupId).members.size > 0) throw new Error('The group is not empty')
      this.groups.delete(groupId)
      return null
    },
    resetOffsets: (request) => {
      const group = this.group(request.groupId)
      if (group.members.size > 0) throw new Error('Stop the group before resetting its offsets')
      this.topic(request.topic).partitions.forEach((partition, index) =>
        group.offsets.set(`${request.topic}:${index}`, this.resetTarget(request, partition))
      )
      return this.groupOffsets(request.groupId).filter((offset) => offset.topic === request.topic)
    },
    deleteGroupOffsets: ({ groupId, topic }) => {
      const offsets = this.group(groupId).offsets
      for (const key of [...offsets.keys()]) if (key.startsWith(`${topic}:`)) offsets.delete(key)
      return null
    }
  }
}

/** Installs the fake cluster on the current `window.wiremate` bridge. */
export function installKafkaCluster(): FakeKafkaCluster {
  const cluster = new FakeKafkaCluster()
  if (!window.wiremate) throw new Error('Install a bridge first')
  Object.assign(window.wiremate, {
    openKafka: cluster.openKafka.bind(cluster),
    produceKafka: cluster.produceKafka.bind(cluster),
    closeKafka: cluster.closeKafka.bind(cluster),
    onKafkaEvent: cluster.onKafkaEvent.bind(cluster),
    kafkaAdmin: cluster.kafkaAdmin.bind(cluster)
  })
  return cluster
}
