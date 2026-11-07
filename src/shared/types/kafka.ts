import type { KafkaConfig } from './protocol'

export interface KafkaHeader {
  key: string
  value: string
}

/** Where a record sits in its topic and what it carried besides its value. Offsets are decimal strings. */
export interface KafkaRecordMeta {
  topic: string
  partition: number
  offset: string
  key: string | null
  headers: KafkaHeader[]
  /** Epoch milliseconds. */
  timestamp: number
}

/** What a producer sends: the record, before the broker has placed it. */
export interface KafkaOutgoing {
  topic: string
  key: string
  value: string
  headers: KafkaHeader[]
  /** Unset lets the partitioner choose. */
  partition?: number
}

/** What happened on a producer or consumer, as its session reports it. */
export type KafkaEventBody =
  | { kind: 'open' | 'info' | 'error' | 'close'; message: string }
  | { kind: 'in' | 'out'; record: KafkaRecordMeta; bytes: Uint8Array }

/** A Kafka event on its way to the renderer, tagged with its session and time. */
export type KafkaEvent = KafkaEventBody & { sessionId: string; at: number }

/** A producer or consumer the main process opens, with the request's variables filled in. */
export type KafkaSessionSpec = KafkaConfig & { mode: 'producer' | 'consumer' }

export interface KafkaBroker {
  id: number
  host: string
  port: number
  rack: string | null
}

export interface KafkaClusterInfo {
  clusterId: string
  controllerId: number
  brokers: KafkaBroker[]
}

export interface KafkaTopicSummary {
  name: string
  partitions: number
  replicas: number
  internal: boolean
}

export interface KafkaPartitionInfo {
  partition: number
  leader: number
  replicas: number[]
  isr: number[]
  /** The oldest offset still kept, and the next offset to be written. */
  earliest: string
  latest: string
}

export interface KafkaConfigEntry {
  name: string
  value: string | null
  readOnly: boolean
  /** Set on the topic itself, rather than inherited from the broker or the defaults. */
  overridden: boolean
  sensitive: boolean
}

export interface KafkaTopicDetails {
  name: string
  id: string
  partitions: KafkaPartitionInfo[]
  configs: KafkaConfigEntry[]
}

export interface KafkaGroupSummary {
  id: string
  state: string
  protocolType: string
}

export interface KafkaGroupMember {
  id: string
  clientId: string
  host: string
  /** `topic[0,1]` for each topic the member reads. */
  assignments: string[]
}

export interface KafkaGroupOffset {
  topic: string
  partition: number
  committed: string
  latest: string
  lag: string
}

export interface KafkaGroupDetails {
  id: string
  state: string
  protocol: string
  members: KafkaGroupMember[]
  offsets: KafkaGroupOffset[]
}

/** Where a group's offsets move: to either end of the partitions, to a time, or to an exact offset. */
export const KAFKA_RESET_TARGETS = ['earliest', 'latest', 'timestamp', 'offset'] as const
export type KafkaResetTarget = (typeof KAFKA_RESET_TARGETS)[number]

/** Every admin request, by action, and what it answers. */
export interface KafkaAdminActions {
  cluster: { request: object; result: KafkaClusterInfo }
  listTopics: { request: object; result: KafkaTopicSummary[] }
  describeTopic: { request: { topic: string }; result: KafkaTopicDetails }
  createTopic: {
    request: { topic: string; partitions: number; replicas: number; configs: KafkaHeader[] }
    result: KafkaTopicSummary
  }
  deleteTopic: { request: { topic: string }; result: null }
  addPartitions: { request: { topic: string; count: number }; result: null }
  alterTopicConfig: { request: { topic: string; name: string; value: string | null }; result: null }
  deleteRecords: { request: { topic: string; partition: number; before: string }; result: { lowWatermark: string } }
  listGroups: { request: object; result: KafkaGroupSummary[] }
  describeGroup: { request: { groupId: string }; result: KafkaGroupDetails }
  deleteGroup: { request: { groupId: string }; result: null }
  resetOffsets: {
    request: { groupId: string; topic: string; target: KafkaResetTarget; value: string }
    result: KafkaGroupOffset[]
  }
  deleteGroupOffsets: { request: { groupId: string; topic: string }; result: null }
}

export type KafkaAdminAction = keyof KafkaAdminActions

export type KafkaAdminRequest<A extends KafkaAdminAction = KafkaAdminAction> = {
  [K in A]: { action: K } & KafkaAdminActions[K]['request']
}[A]

export type KafkaAdminResult<A extends KafkaAdminAction> = KafkaAdminActions[A]['result']

/** Admin calls never throw across the bridge: they answer with the result or with what went wrong. */
export type KafkaAdminOutcome<A extends KafkaAdminAction> =
  { ok: true; value: KafkaAdminResult<A> } | { ok: false; error: string }
