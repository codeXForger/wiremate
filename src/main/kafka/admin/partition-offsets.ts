import { ListOffsetTimestamps, type Admin } from '@platformatic/kafka'

export interface OffsetRange {
  earliest: Map<number, bigint>
  latest: Map<number, bigint>
}

/** The offset of every partition of a topic at a time; -1 is the end, -2 the start. */
export async function partitionOffsets(
  admin: Admin,
  topic: string,
  { partitions, timestamp }: { partitions: number[]; timestamp: bigint }
): Promise<Map<number, bigint>> {
  if (partitions.length === 0) return new Map()
  const listed = await admin.listOffsets({
    topics: [{ name: topic, partitions: partitions.map((partitionIndex) => ({ partitionIndex, timestamp })) }]
  })
  const found = listed.flatMap((entry) => entry.partitions)
  return new Map(found.map((partition) => [partition.partitionIndex, partition.offset]))
}

export function latestOffsets(admin: Admin, topic: string, partitions: number[]): Promise<Map<number, bigint>> {
  return partitionOffsets(admin, topic, { partitions, timestamp: ListOffsetTimestamps.LATEST })
}

export function earliestOffsets(admin: Admin, topic: string, partitions: number[]): Promise<Map<number, bigint>> {
  return partitionOffsets(admin, topic, { partitions, timestamp: ListOffsetTimestamps.EARLIEST })
}

/** The first and the next offset of each partition. */
export async function offsetRange(admin: Admin, topic: string, partitions: number[]): Promise<OffsetRange> {
  const [earliest, latest] = await Promise.all([
    earliestOffsets(admin, topic, partitions),
    latestOffsets(admin, topic, partitions)
  ])
  return { earliest, latest }
}

/** The partitions of a topic, numbered from 0; fails for a topic the cluster does not have. */
export async function partitionsOf(admin: Admin, topic: string): Promise<number[]> {
  const metadata = await admin.metadata({ topics: [topic] })
  const found = metadata.topics.get(topic)
  if (!found) throw new Error(`Topic "${topic}" does not exist`)
  return found.partitions.map((_, index) => index)
}
