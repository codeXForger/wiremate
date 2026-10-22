import type { ComponentType } from 'react'
import {
  ArrowLeftRight,
  Bot,
  Globe,
  Layers,
  Plug,
  Rabbit,
  Radio,
  RadioTower,
  Send,
  Waypoints,
  type LucideIcon
} from 'lucide-react'
import { PROTOCOL_METADATA } from '@shared/protocols/metadata'
import { PROTOCOL_IDS, type ProtocolId } from '@shared/types/protocol'
import { GraphqlEditor } from './graphql/GraphqlEditor'
import { HttpEditor } from './http/HttpEditor'
import { KafkaEditor } from './kafka/kafka-editor'
import { McpEditor } from './mcp/McpEditor'
import { MqttEditor } from './mqtt/mqtt-editor'
import { RabbitMqEditor } from './rabbitmq/rabbitmq-editor'
import { protocolRegistry } from './registry'
import { SocketEditor } from './socket/SocketEditor'
import { SocketIoEditor } from './socketio/socketio-editor'
import type { EditorProps } from './types'
import { WebSocketEditor } from './websocket/WebSocketEditor'

const PLUGINS: Record<ProtocolId, { icon: LucideIcon; Editor: ComponentType<EditorProps> }> = {
  http: { icon: Globe, Editor: HttpEditor },
  graphql: { icon: Waypoints, Editor: GraphqlEditor },
  websocket: { icon: ArrowLeftRight, Editor: WebSocketEditor },
  socketio: { icon: Radio, Editor: SocketIoEditor },
  tcp: { icon: Plug, Editor: SocketEditor },
  udp: { icon: Send, Editor: SocketEditor },
  rabbitmq: { icon: Rabbit, Editor: RabbitMqEditor },
  kafka: { icon: Layers, Editor: KafkaEditor },
  mqtt: { icon: RadioTower, Editor: MqttEditor },
  mcp: { icon: Bot, Editor: McpEditor }
}

PROTOCOL_IDS.forEach((id) => protocolRegistry.register({ id, meta: PROTOCOL_METADATA[id], ...PLUGINS[id] }))

export { protocolRegistry }
