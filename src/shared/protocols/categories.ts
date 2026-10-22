import type { ProtocolId } from '../types/protocol'

export const CATEGORY_IDS = ['api', 'realtime', 'mcp', 'mqtt', 'kafka', 'pubsub', 'network'] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

export interface CategoryMetadata {
  label: string
  description: string
  protocols: readonly ProtocolId[]
}

/** Groups protocols into the sections of the navigation rail. Every protocol belongs to exactly one category. */
export const CATEGORIES: Record<CategoryId, CategoryMetadata> = {
  api: { label: 'API', description: 'REST and GraphQL endpoints', protocols: ['http', 'graphql'] },
  realtime: {
    label: 'Realtime',
    description: 'WebSocket and Socket.IO connections',
    protocols: ['websocket', 'socketio']
  },
  mcp: { label: 'MCP', description: 'Model Context Protocol servers and clients', protocols: ['mcp'] },
  mqtt: { label: 'MQTT', description: 'IoT brokers, topics and messages', protocols: ['mqtt'] },
  kafka: { label: 'Kafka', description: 'Topics, producers and consumers', protocols: ['kafka'] },
  pubsub: { label: 'Pub/Sub', description: 'Message queues and brokers', protocols: ['rabbitmq'] },
  network: { label: 'Network', description: 'Raw TCP sockets and UDP datagrams', protocols: ['tcp', 'udp'] }
}

const CATEGORY_BY_PROTOCOL = new Map<ProtocolId, CategoryId>(
  CATEGORY_IDS.flatMap((category) => CATEGORIES[category].protocols.map((protocol) => [protocol, category] as const))
)

export function categoryOf(protocol: ProtocolId): CategoryId {
  return CATEGORY_BY_PROTOCOL.get(protocol) ?? 'api'
}

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value)
}
