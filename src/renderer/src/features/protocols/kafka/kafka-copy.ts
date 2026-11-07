import type { KafkaAcks, KafkaAuthMechanism, KafkaMode, KafkaStartPosition } from '@shared/types/protocol'
import type { ModeLabel } from '../../request/components/ModeToolbar'

export interface KafkaModeCopy extends ModeLabel {
  /** The session button; admin has none. */
  open: string
  close: string
}

export const KAFKA_COPY: Record<KafkaMode, KafkaModeCopy> = {
  producer: { label: 'Producer', hint: 'Sends records to a topic', open: 'Connect', close: 'Disconnect' },
  consumer: {
    label: 'Consumer',
    hint: 'Reads topics as a member of a consumer group',
    open: 'Start consuming',
    close: 'Stop'
  },
  admin: {
    label: 'Admin',
    hint: 'Topics, partitions, consumer groups and their offsets',
    open: 'Refresh',
    close: 'Refresh'
  }
}

export const ACKS_LABELS: Record<KafkaAcks, string> = {
  all: 'All in-sync replicas',
  leader: 'Leader only',
  none: 'None (fire and forget)'
}

export const START_LABELS: Record<KafkaStartPosition, string> = {
  latest: 'Latest (new records only)',
  earliest: 'Earliest (from the beginning)',
  committed: "Group's committed offsets",
  timestamp: 'A date and time'
}

export const AUTH_LABELS: Record<KafkaAuthMechanism, string> = {
  none: 'None',
  PLAIN: 'SASL PLAIN',
  'SCRAM-SHA-256': 'SASL SCRAM-SHA-256',
  'SCRAM-SHA-512': 'SASL SCRAM-SHA-512'
}
