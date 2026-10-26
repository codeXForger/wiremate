import type { ProtocolId } from '../types/protocol'

export const CATEGORY_IDS = ['api', 'graphql', 'realtime', 'mcp', 'mqtt', 'kafka', 'pubsub', 'network'] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

/** What a section calls the things in it. */
export interface CategoryTerms {
  /** One of them: "request", "connection". */
  item: string
  /** The list of them: "Collections", "Connections". */
  list: string
  /** A folder of them: "collection", "folder". */
  group: string
  /**
   * New items open as drafts that join the list once saved with a name; otherwise they are added (and saved) at once.
   */
  saveExplicitly: boolean
}

export interface CategoryMetadata {
  label: string
  description: string
  protocols: readonly ProtocolId[]
  terms?: Partial<CategoryTerms>
}

const DEFAULT_TERMS: CategoryTerms = {
  item: 'request',
  list: 'Collections',
  group: 'collection',
  saveExplicitly: false
}

/** Groups protocols into the sections of the navigation rail. Every protocol belongs to exactly one category. */
export const CATEGORIES: Record<CategoryId, CategoryMetadata> = {
  api: { label: 'API', description: 'REST and HTTP endpoints', protocols: ['http'] },
  graphql: { label: 'GraphQL', description: 'Queries, mutations and subscriptions', protocols: ['graphql'] },
  realtime: {
    label: 'Realtime',
    description: 'WebSocket and Socket.IO connections',
    protocols: ['websocket', 'socketio']
  },
  mcp: { label: 'MCP', description: 'Model Context Protocol servers and clients', protocols: ['mcp'] },
  mqtt: { label: 'MQTT', description: 'IoT brokers, topics and messages', protocols: ['mqtt'] },
  kafka: { label: 'Kafka', description: 'Topics, producers and consumers', protocols: ['kafka'] },
  pubsub: { label: 'Pub/Sub', description: 'Message queues and brokers', protocols: ['rabbitmq'] },
  network: {
    label: 'Network',
    description: 'TCP clients and servers, UDP sockets',
    protocols: ['tcp', 'udp'],
    terms: { item: 'connection', list: 'Connections', group: 'folder', saveExplicitly: true }
  }
}

const CATEGORY_BY_PROTOCOL = new Map<ProtocolId, CategoryId>(
  CATEGORY_IDS.flatMap((category) => CATEGORIES[category].protocols.map((protocol) => [protocol, category] as const))
)

export function categoryOf(protocol: ProtocolId): CategoryId {
  return CATEGORY_BY_PROTOCOL.get(protocol) ?? 'api'
}

export function categoryTerms(category: CategoryId): CategoryTerms {
  return { ...DEFAULT_TERMS, ...CATEGORIES[category].terms }
}

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value)
}
