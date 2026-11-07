import type { KafkaRecordMeta } from '../types/kafka'
import type { KafkaConfig, KafkaConnection } from '../types/protocol'

/** Splits a comma-separated list, dropping blanks: `a, b,,c` → `['a', 'b', 'c']`. */
export function splitList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

/** The part of a config that says how to reach the cluster. */
export function kafkaConnection(config: KafkaConfig): KafkaConnection {
  const { brokers, clientId, auth, username, password, ssl } = config
  return { brokers, clientId, auth, username, password, ssl }
}

const WHOLE_NUMBER = /^\d+$/

/** A partition typed by the user: empty lets the partitioner choose; anything else must be a whole number. */
export function parsePartition(text: string): number | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  if (!WHOLE_NUMBER.test(trimmed)) throw new Error(`Partition "${trimmed}" is not a whole number`)
  return Number(trimmed)
}

/** A decimal offset typed by the user, e.g. to reset a group to. */
export function parseOffset(text: string): string {
  const trimmed = text.trim()
  if (!WHOLE_NUMBER.test(trimmed)) throw new Error(`Offset "${trimmed}" is not a whole number`)
  return trimmed
}

/** A time typed by the user: epoch milliseconds, or anything `Date` reads (`2026-10-26T09:30`). */
export function parseTimestamp(text: string): number {
  const trimmed = text.trim()
  const time = WHOLE_NUMBER.test(trimmed) ? Number(trimmed) : Date.parse(trimmed)
  if (trimmed === '' || Number.isNaN(time)) throw new Error(`"${trimmed}" is not a date and time`)
  return time
}

/** `orders[0,2]` */
export function formatAssignment(topic: string, partitions: readonly number[]): string {
  return `${topic}[${[...partitions].sort((a, b) => a - b).join(',')}]`
}

/** Where a record sits: `orders[1]@42`; without an offset (acks "none"), `orders[1]`; without a partition, `orders`. */
export function recordLocation({
  topic,
  partition,
  offset
}: Pick<KafkaRecordMeta, 'topic' | 'partition' | 'offset'>): string {
  if (partition < 0) return topic
  return offset === '' ? `${topic}[${partition}]` : `${topic}[${partition}]@${offset}`
}
