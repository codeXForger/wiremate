import { ListOffsetTimestamps, type Admin, type GroupMember } from '@platformatic/kafka'
import { formatAssignment, parseOffset, parseTimestamp } from '@shared/kafka/kafka-text'
import type { KafkaAdminActions, KafkaGroupMember, KafkaGroupOffset, KafkaResetTarget } from '@shared/types/kafka'
import { latestOffsets, partitionOffsets, partitionsOf } from './partition-offsets'

type Request<A extends keyof KafkaAdminActions> = KafkaAdminActions[A]['request']
type Result<A extends keyof KafkaAdminActions> = Promise<KafkaAdminActions[A]['result']>

interface Committed {
  topic: string
  partition: number
  offset: bigint
}

/** How far a group is behind: the records written after its committed offset (all of them, if none is committed). */
function lagOf(committed: bigint, latest: bigint): bigint {
  const behind = latest - (committed < 0n ? 0n : committed)
  return behind < 0n ? 0n : behind
}

function toMember(member: GroupMember): KafkaGroupMember {
  const assignments = [...(member.assignments?.values() ?? [])]
  return {
    id: member.id,
    clientId: member.clientId,
    host: member.clientHost,
    assignments: assignments.map(({ topic, partitions }) => formatAssignment(topic, partitions))
  }
}

/** Consumer groups: list, describe with members and lag, delete, move or forget their committed offsets. */
export class GroupAdmin {
  public static async listGroups(admin: Admin): Result<'listGroups'> {
    const groups = [...(await admin.listGroups()).values()]
    return groups
      .map(({ id, state, protocolType }) => ({ id, state, protocolType }))
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  public static async describeGroup(admin: Admin, { groupId }: Request<'describeGroup'>): Result<'describeGroup'> {
    const group = (await admin.describeGroups({ groups: [groupId] })).get(groupId)
    if (!group || group.error) throw group?.error ?? new Error(`Group "${groupId}" does not exist`)
    const committed = await GroupAdmin.committed(admin, groupId)
    return {
      id: groupId,
      state: group.state,
      protocol: group.protocol,
      members: [...group.members.values()].map(toMember),
      offsets: await GroupAdmin.withLag(admin, committed)
    }
  }

  public static async deleteGroup(admin: Admin, { groupId }: Request<'deleteGroup'>): Result<'deleteGroup'> {
    await admin.deleteGroups({ groups: [groupId] })
    return null
  }

  /** Moves a group's committed offsets on every partition of a topic; the group must have no active members. */
  public static async resetOffsets(admin: Admin, request: Request<'resetOffsets'>): Result<'resetOffsets'> {
    const { groupId, topic } = request
    const partitions = await partitionsOf(admin, topic)
    const targets = await GroupAdmin.targets(admin, request, partitions)
    const partitionOffsets = partitions.map((partition) => ({ partition, offset: targets.get(partition) ?? 0n }))
    await admin.alterConsumerGroupOffsets({ groupId, topics: [{ name: topic, partitionOffsets }] })
    const committed = partitionOffsets.map(({ partition, offset }) => ({ topic, partition, offset }))
    return GroupAdmin.withLag(admin, committed)
  }

  public static async deleteGroupOffsets(
    admin: Admin,
    request: Request<'deleteGroupOffsets'>
  ): Result<'deleteGroupOffsets'> {
    const { groupId, topic } = request
    const partitionIndexes = await partitionsOf(admin, topic)
    await admin.deleteConsumerGroupOffsets({ groupId, topics: [{ name: topic, partitionIndexes }] })
    return null
  }

  private static async committed(admin: Admin, groupId: string): Promise<Committed[]> {
    const [listed] = await admin.listConsumerGroupOffsets({ groups: [groupId] })
    return (listed?.topics ?? []).flatMap(({ name, partitions }) =>
      partitions.map((partition) => ({
        topic: name,
        partition: partition.partitionIndex,
        offset: partition.committedOffset
      }))
    )
  }

  /** Each committed offset next to the end of its partition. */
  private static async withLag(admin: Admin, committed: Committed[]): Promise<KafkaGroupOffset[]> {
    const topics = [...new Set(committed.map((entry) => entry.topic))]
    const ends = new Map(
      await Promise.all(
        topics.map(async (topic) => {
          const partitions = committed.filter((entry) => entry.topic === topic).map((entry) => entry.partition)
          return [topic, await latestOffsets(admin, topic, partitions)] as const
        })
      )
    )
    return committed.map(({ topic, partition, offset }) => {
      const latest = ends.get(topic)?.get(partition) ?? 0n
      return { topic, partition, committed: String(offset), latest: String(latest), lag: String(lagOf(offset, latest)) }
    })
  }

  private static targets(
    admin: Admin,
    request: Request<'resetOffsets'>,
    partitions: number[]
  ): Promise<Map<number, bigint>> {
    const { topic, target, value } = request
    const timestamp = RESET_TIMESTAMPS[target](value)
    if (timestamp === undefined) return Promise.resolve(new Map(partitions.map((p) => [p, BigInt(parseOffset(value))])))
    return GroupAdmin.offsetsAt(admin, topic, { partitions, timestamp })
  }

  /** A time with nothing written after it moves to the end of the partition. */
  private static async offsetsAt(
    admin: Admin,
    topic: string,
    query: { partitions: number[]; timestamp: bigint }
  ): Promise<Map<number, bigint>> {
    const found = await partitionOffsets(admin, topic, query)
    if ([...found.values()].every((offset) => offset >= 0n)) return found
    const latest = await latestOffsets(admin, topic, query.partitions)
    return new Map(
      [...found].map(([partition, offset]) => [partition, offset >= 0n ? offset : (latest.get(partition) ?? 0n)])
    )
  }
}

/** The time each target looks up; an exact offset needs none. */
const RESET_TIMESTAMPS: Record<KafkaResetTarget, (value: string) => bigint | undefined> = {
  earliest: () => ListOffsetTimestamps.EARLIEST,
  latest: () => ListOffsetTimestamps.LATEST,
  timestamp: (value) => BigInt(parseTimestamp(value)),
  offset: () => undefined
}
