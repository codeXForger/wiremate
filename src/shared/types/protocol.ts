export const PROTOCOL_IDS = [
  'http',
  'graphql',
  'websocket',
  'socketio',
  'tcp',
  'udp',
  'rabbitmq',
  'kafka',
  'mqtt',
  'mcp'
] as const

export type ProtocolId = (typeof PROTOCOL_IDS)[number]

export interface KeyValue {
  id: string
  key: string
  value: string
  enabled: boolean
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

export type BodyMode = 'none' | 'json' | 'text'
export type AuthType = 'none' | 'bearer' | 'basic'
export type PayloadEncoding = 'text' | 'hex'

export interface HttpConfig {
  method: HttpMethod
  url: string
  params: KeyValue[]
  headers: KeyValue[]
  body: { mode: BodyMode; content: string }
  auth: { type: AuthType; token: string; username: string; password: string }
}

export interface GraphqlConfig {
  url: string
  query: string
  variables: string
  headers: KeyValue[]
}

export interface WebSocketConfig {
  url: string
  message: string
  headers: KeyValue[]
}

export interface SocketIoConfig {
  url: string
  path: string
  event: string
  message: string
}

export interface SocketConfig {
  host: string
  port: number
  payload: string
  encoding: PayloadEncoding
}

export interface RabbitMqConfig {
  url: string
  exchange: string
  routingKey: string
  queue: string
  message: string
}

export interface KafkaConfig {
  brokers: string
  topic: string
  groupId: string
  key: string
  value: string
}

export const MQTT_QOS_LEVELS = ['0', '1', '2'] as const
export type MqttQos = (typeof MQTT_QOS_LEVELS)[number]

export interface MqttConfig {
  brokerUrl: string
  clientId: string
  topic: string
  qos: MqttQos
  retain: boolean
  payload: string
}

export type McpMode = 'client' | 'server'
export type McpTransport = 'stdio' | 'http'

export interface McpConfig {
  mode: McpMode
  transport: McpTransport
  command: string
  url: string
}

export interface ProtocolConfigMap {
  http: HttpConfig
  graphql: GraphqlConfig
  websocket: WebSocketConfig
  socketio: SocketIoConfig
  tcp: SocketConfig
  udp: SocketConfig
  rabbitmq: RabbitMqConfig
  kafka: KafkaConfig
  mqtt: MqttConfig
  mcp: McpConfig
}

export interface RequestDocument<P extends ProtocolId = ProtocolId> {
  id: string
  name: string
  protocol: P
  config: ProtocolConfigMap[P]
}

export type AnyRequest = { [P in ProtocolId]: RequestDocument<P> }[ProtocolId]
