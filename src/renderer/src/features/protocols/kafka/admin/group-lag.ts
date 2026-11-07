import type { KafkaGroupOffset } from '@shared/types/kafka'

export interface TopicLag {
  topic: string
  partitions: number
  lag: bigint
}

/** The committed offsets, summed up per topic. */
export function lagByTopic(offsets: KafkaGroupOffset[]): TopicLag[] {
  const topics = new Map<string, TopicLag>()
  for (const { topic, lag } of offsets) {
    const known = topics.get(topic) ?? { topic, partitions: 0, lag: 0n }
    topics.set(topic, { topic, partitions: known.partitions + 1, lag: known.lag + BigInt(lag) })
  }
  return [...topics.values()]
}
