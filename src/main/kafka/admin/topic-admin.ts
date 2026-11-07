import {
  ConfigResourceTypes,
  ConfigSources,
  IncrementalAlterConfigOperationTypes,
  type Admin,
  type ClusterPartitionMetadata
} from '@platformatic/kafka'
import type { KafkaAdminActions, KafkaConfigEntry, KafkaPartitionInfo, KafkaTopicSummary } from '@shared/types/kafka'
import { offsetRange } from './partition-offsets'

type Request<A extends keyof KafkaAdminActions> = KafkaAdminActions[A]['request']
type Result<A extends keyof KafkaAdminActions> = Promise<KafkaAdminActions[A]['result']>

/** Topics: list, describe with partitions, offsets and configs, create, delete, grow, configure, truncate. */
export class TopicAdmin {
  public static async listTopics(admin: Admin): Result<'listTopics'> {
    const names = await admin.listTopics({ includeInternals: true })
    if (names.length === 0) return []
    const metadata = await admin.metadata({ topics: names })
    return names.sort().map((name): KafkaTopicSummary => {
      const partitions = metadata.topics.get(name)?.partitions ?? []
      return {
        name,
        partitions: partitions.length,
        replicas: partitions[0]?.replicas.length ?? 0,
        internal: name.startsWith('__')
      }
    })
  }

  public static async describeTopic(admin: Admin, { topic }: Request<'describeTopic'>): Result<'describeTopic'> {
    const metadata = await admin.metadata({ topics: [topic] })
    const found = metadata.topics.get(topic)
    if (!found) throw new Error(`Topic "${topic}" does not exist`)
    const [partitions, configs] = await Promise.all([
      TopicAdmin.partitions(admin, topic, found.partitions),
      TopicAdmin.configs(admin, topic)
    ])
    return { name: topic, id: found.id, partitions, configs }
  }

  public static async createTopic(admin: Admin, request: Request<'createTopic'>): Result<'createTopic'> {
    const { topic, partitions, replicas, configs } = request
    const entries = configs.map(({ key, value }) => ({ name: key, value }))
    const [created] = await admin.createTopics({ topics: [topic], partitions, replicas, configs: entries })
    return {
      name: topic,
      partitions: created?.partitions ?? partitions,
      replicas: created?.replicas ?? replicas,
      internal: false
    }
  }

  public static async deleteTopic(admin: Admin, { topic }: Request<'deleteTopic'>): Result<'deleteTopic'> {
    await admin.deleteTopics({ topics: [topic] })
    return null
  }

  public static async addPartitions(admin: Admin, { topic, count }: Request<'addPartitions'>): Result<'addPartitions'> {
    await admin.createPartitions({ topics: [{ name: topic, count, assignments: null }] })
    return null
  }

  public static async alterTopicConfig(admin: Admin, request: Request<'alterTopicConfig'>): Result<'alterTopicConfig'> {
    const { topic, name, value } = request
    const configOperation =
      value === null ? IncrementalAlterConfigOperationTypes.DELETE : IncrementalAlterConfigOperationTypes.SET
    await admin.incrementalAlterConfigs({
      resources: [
        {
          resourceType: ConfigResourceTypes.TOPIC,
          resourceName: topic,
          configs: [{ name, configOperation, value: value ?? '' }]
        }
      ]
    })
    return null
  }

  public static async deleteRecords(admin: Admin, request: Request<'deleteRecords'>): Result<'deleteRecords'> {
    const { topic, partition, before } = request
    const deleted = await admin.deleteRecords({
      topics: [{ name: topic, partitions: [{ partition, offset: BigInt(before) }] }]
    })
    const lowWatermark = deleted[0]?.partitions[0]?.lowWatermark ?? BigInt(before)
    return { lowWatermark: lowWatermark.toString() }
  }

  private static async partitions(
    admin: Admin,
    topic: string,
    metadata: ClusterPartitionMetadata[]
  ): Promise<KafkaPartitionInfo[]> {
    const numbers = metadata.map((_, index) => index)
    const { earliest, latest } = await offsetRange(admin, topic, numbers)
    return metadata.map(({ leader, replicas, isr }, partition) => {
      const range = { earliest: String(earliest.get(partition) ?? 0n), latest: String(latest.get(partition) ?? 0n) }
      return { partition, leader, replicas, isr, ...range }
    })
  }

  private static async configs(admin: Admin, topic: string): Promise<KafkaConfigEntry[]> {
    const [described] = await admin.describeConfigs({
      resources: [{ resourceType: ConfigResourceTypes.TOPIC, resourceName: topic }]
    })
    const entries = (described?.configs ?? []).map((config): KafkaConfigEntry => ({
      name: config.name,
      value: config.value ?? null,
      readOnly: config.readOnly,
      overridden: config.configSource === ConfigSources.DYNAMIC_TOPIC_CONFIG,
      sensitive: config.isSensitive
    }))
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }
}
