import type { ProtocolId } from '../types/protocol'

export type InteractionStyle = 'exchange' | 'stream'

export interface ProtocolMetadata {
  label: string
  short: string
  description: string
  style: InteractionStyle
}

export const PROTOCOL_METADATA: Record<ProtocolId, ProtocolMetadata> = {
  http: {
    label: 'HTTP',
    short: 'HTTP',
    description: 'REST and plain HTTP requests',
    style: 'exchange'
  },
  graphql: {
    label: 'GraphQL',
    short: 'GQL',
    description: 'Queries and mutations',
    style: 'exchange'
  },
  websocket: {
    label: 'WebSocket',
    short: 'WS',
    description: 'Raw WebSocket connections',
    style: 'stream'
  },
  socketio: { label: 'Socket.IO', short: 'SIO', description: 'Socket.IO events', style: 'stream' },
  tcp: { label: 'TCP', short: 'TCP', description: 'Raw TCP sockets', style: 'stream' },
  udp: { label: 'UDP', short: 'UDP', description: 'UDP datagrams', style: 'stream' },
  rabbitmq: {
    label: 'RabbitMQ',
    short: 'AMQP',
    description: 'Publish and consume AMQP messages',
    style: 'stream'
  },
  kafka: {
    label: 'Kafka',
    short: 'KFK',
    description: 'Produce and consume topics',
    style: 'stream'
  },
  mcp: {
    label: 'MCP',
    short: 'MCP',
    description: 'Model Context Protocol client and server',
    style: 'stream'
  }
}
