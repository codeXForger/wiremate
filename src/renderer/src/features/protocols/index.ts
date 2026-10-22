import { ArrowLeftRight, Bot, Globe, Layers, Plug, Rabbit, Radio, Send, Waypoints } from 'lucide-react'
import { PROTOCOL_METADATA } from '@shared/protocols/metadata'
import { GraphqlEditor } from './graphql/GraphqlEditor'
import { HttpEditor } from './http/HttpEditor'
import { KafkaEditor } from './kafka/kafka-editor'
import { McpEditor } from './mcp/McpEditor'
import { RabbitMqEditor } from './rabbitmq/rabbitmq-editor'
import { protocolRegistry } from './registry'
import { SocketEditor } from './socket/SocketEditor'
import { SocketIoEditor } from './socketio/socketio-editor'
import { WebSocketEditor } from './websocket/WebSocketEditor'

protocolRegistry.register({
  id: 'http',
  meta: PROTOCOL_METADATA.http,
  icon: Globe,
  Editor: HttpEditor
})
protocolRegistry.register({
  id: 'graphql',
  meta: PROTOCOL_METADATA.graphql,
  icon: Waypoints,
  Editor: GraphqlEditor
})
protocolRegistry.register({
  id: 'websocket',
  meta: PROTOCOL_METADATA.websocket,
  icon: ArrowLeftRight,
  Editor: WebSocketEditor
})
protocolRegistry.register({
  id: 'socketio',
  meta: PROTOCOL_METADATA.socketio,
  icon: Radio,
  Editor: SocketIoEditor
})
protocolRegistry.register({
  id: 'tcp',
  meta: PROTOCOL_METADATA.tcp,
  icon: Plug,
  Editor: SocketEditor
})
protocolRegistry.register({
  id: 'udp',
  meta: PROTOCOL_METADATA.udp,
  icon: Send,
  Editor: SocketEditor
})
protocolRegistry.register({
  id: 'rabbitmq',
  meta: PROTOCOL_METADATA.rabbitmq,
  icon: Rabbit,
  Editor: RabbitMqEditor
})
protocolRegistry.register({
  id: 'kafka',
  meta: PROTOCOL_METADATA.kafka,
  icon: Layers,
  Editor: KafkaEditor
})
protocolRegistry.register({ id: 'mcp', meta: PROTOCOL_METADATA.mcp, icon: Bot, Editor: McpEditor })

export { protocolRegistry }
